// src/controllers/ride.controller.js
import mongoose from "mongoose";
import Ride from "../models/ride.model.js";
import Booking from "../models/booking.model.js";
import Review from "../models/review.model.js";
import User from "../models/user.model.js";
import Car from "../models/car.model.js";

import { sendInAppNotification, notifyMultipleUsers, sendEmail } from "../utils/notification.js";

/* --------------------------
   DRIVER APIs
   - createRide (was offerRide)
   - updateRide
   - deleteRide (mark cancelled + notify)
---------------------------*/

// Create ride (driver). Accepts either carId or car object to create.
export const createRide = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const driverId = req.user.id;
    const {
      carId,
      car, // optional car object to create { make, model, seats, plateNumber, ... }
      fromCity,
      toCity,
      pickupLocation, // { lat, lon, address }
      pickupTime,
      reachTime,
      dropoffLocation,
      stops, // array of { lat, lon, address, eta }
      seatsAvailable,
      pricePerSeat,
      luggage,
      instructions,
      preferences,
      bookingMode // 'direct' | 'request'
    } = req.body;

    // basic validations
    if (!fromCity || !toCity || !pickupLocation || !pickupTime || !seatsAvailable || !pricePerSeat) {
      return res.status(400).json({ error: "Missing required ride fields" });
    }

    let carDoc = null;
    if (carId) {
      carDoc = await Car.findById(carId);
      if (!carDoc) {
        await session.abortTransaction();
        return res.status(404).json({ error: "Car not found" });
      }
      if (carDoc.owner.toString() !== driverId.toString()) {
        await session.abortTransaction();
        return res.status(403).json({ error: "Car does not belong to authenticated driver" });
      }
    } else if (car && Object.keys(car).length > 0) {
      // create new car for driver
      carDoc = new Car({ ...car, owner: driverId });
      await carDoc.save({ session });
    }

    // if car is present, ensure seatsAvailable <= car.seats
    if (carDoc && carDoc.seats && seatsAvailable > carDoc.seats) {
      await session.abortTransaction();
      return res.status(400).json({ error: "seatsAvailable cannot exceed car's seating capacity" });
    }

    const ride = new Ride({
      driver: driverId,
      car: carDoc ? carDoc._id : undefined,
      fromCity,
      toCity,
      pickupLocation,
      pickupTime: new Date(pickupTime),
      reachTime: reachTime ? new Date(reachTime) : undefined,
      dropoffLocation,
      stops: Array.isArray(stops) ? stops : [],
      seatsAvailable,
      totalSeats: carDoc?.seats ?? seatsAvailable,
      pricePerSeat,
      luggage,
      instructions,
      preferences: preferences || {},
      bookingMode: bookingMode || "request",
      status: "active",
    });

    await ride.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({ message: "Ride created", ride });
  } catch (err) {
    await session.abortTransaction().catch(() => {});
    session.endSession();
    console.error("createRide error:", err);
    res.status(500).json({ error: err.message });
  }
};

// Update ride (driver). Only allow a set of editable fields and perform validations.
export const updateRide = async (req, res) => {
  try {
    const { rideId } = req.params;
    const driverId = req.user.id;
    const allowed = [
      "pickupTime",
      "reachTime",
      "pickupLocation",
      "dropoffLocation",
      "stops",
      "pricePerSeat",
      "seatsAvailable",
      "luggage",
      "instructions",
      "preferences",
      "bookingMode",
      "status"
    ];

    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    const ride = await Ride.findById(rideId).populate("car").populate("bookings");
    if (!ride) return res.status(404).json({ error: "Ride not found" });
    if (ride.driver.toString() !== driverId.toString()) return res.status(403).json({ error: "Not authorized" });

    // If updating seatsAvailable: ensure not lower than total already booked seats
    if (updates.seatsAvailable !== undefined) {
      // compute total seats already booked (excluding cancelled bookings)
      const bookedBookings = await Booking.find({ ride: rideId, status: { $ne: "cancelled" } });
      const bookedSeats = bookedBookings.reduce((s, b) => s + (b.seatsBooked || 1), 0);
      if (updates.seatsAvailable < bookedSeats) {
        return res.status(400).json({ error: `seatsAvailable cannot be less than already booked seats (${bookedSeats})` });
      }
      // if car exists check capacity
      if (ride.car && ride.car.seats && updates.seatsAvailable > ride.car.seats) {
        return res.status(400).json({ error: "seatsAvailable cannot exceed car's seating capacity" });
      }
    }

    // apply updates
    Object.assign(ride, updates);
    await ride.save();

    res.json({ message: "Ride updated", ride });
  } catch (err) {
    console.error("updateRide error:", err);
    res.status(500).json({ error: err.message });
  }
};

// Delete ride (driver cancels) — mark cancelled + update bookings + notifications
export const deleteRide = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const { rideId } = req.params;
    const driverId = req.user.id;

    const ride = await Ride.findById(rideId).populate({
      path: "bookings",
      match: { status: { $ne: "cancelled" } },
      populate: { path: "passenger", select: "name email" }
    });

    if (!ride) {
      await session.abortTransaction();
      return res.status(404).json({ error: "Ride not found" });
    }
    if (ride.driver.toString() !== driverId.toString()) {
      await session.abortTransaction();
      return res.status(403).json({ error: "Not authorized" });
    }

    // mark ride cancelled
    ride.status = "cancelled";
    ride.cancelledAt = new Date();
    await ride.save({ session });

    // cancel all active bookings, notify passengers
    const passengerIds = [];
    const bookingUpdates = ride.bookings.map(async (b) => {
      if (b.status !== "cancelled") {
        const updated = await Booking.findByIdAndUpdate(b._id, { status: "cancelled" }, { new: true, session });
        passengerIds.push(b.passenger._id);
        // TODO: add refund logic if payment already taken
        // send notification to this passenger
        sendInAppNotification(req, b.passenger._id, {
          type: "ride_cancelled",
          rideId: ride._id,
          message: `Your booking for ride ${ride.fromCity} → ${ride.toCity} on ${ride.pickupTime} was cancelled by the driver.`
        });

        // optional email
        sendEmail(b.passenger.email, "Ride cancelled", `Your booking for ${ride.fromCity} → ${ride.toCity} was cancelled.`);
      }
    });

    await Promise.all(bookingUpdates);

    await session.commitTransaction();
    session.endSession();

    res.json({ message: "Ride cancelled and passengers notified" });
  } catch (err) {
    await session.abortTransaction().catch(() => {});
    session.endSession();
    console.error("deleteRide error:", err);
    res.status(500).json({ error: err.message });
  }
};

// Confirm booking (driver)
export const confirmBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const booking = await Booking.findById(bookingId).populate("ride");
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    // only ride driver can confirm
    if (booking.ride.driver.toString() !== req.user.id.toString()) {
      return res.status(403).json({ error: "Only driver can confirm booking" });
    }

    booking.status = "confirmed";
    await booking.save();

    // notify passenger
    sendInAppNotification(req, booking.passenger, {
      type: "booking_confirmed",
      bookingId: booking._id,
      rideId: booking.ride._id,
      message: "Your booking has been confirmed by the driver."
    });

    res.json(booking);
  } catch (err) {
    console.error("confirmBooking error:", err);
    res.status(500).json({ error: err.message });
  }
};

/* --------------------------
   PASSENGER APIs (existing)
---------------------------*/

// Search rides
export const searchRides = async (req, res) => {
  try {
    const { from, to, date } = req.query;
    const start = date ? new Date(date) : new Date();
    const end = date ? new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000) : new Date(Date.now() + 24 * 60 * 60 * 1000);

    const rides = await Ride.find({
      fromCity: from,
      toCity: to,
      pickupTime: { $gte: start, $lte: end },
      status: "active"
    })
    .select(
      "_id driver fromCity toCity pickupLocation dropoffLocation pickupTime reachTime seatsAvailable totalSeats pricePerSeat"
    )
    .populate("driver", "username"); 

    res.json(rides);
  } catch (err) {
    console.error("searchRides error:", err);
    res.status(500).json({ error: err.message });
  }
};

// Ride details (includes stops, luggage, instructions, preferences, driver, driver-reviews, passenger list)
export const getRideDetails = async (req, res) => {
  try {
    const { rideId } = req.params;

    const ride = await Ride.findById(rideId)
      .populate("car")
      .populate("driver", "username photo rating bio email")
      .populate({
        path: "bookings",
        populate: { path: "passenger", select: "name photo rating" }
      });

    if (!ride) return res.status(404).json({ error: "Ride not found" });

    // fetch driver reviews
    const reviews = await Review.find({ reviewee: ride.driver._id })
      .populate("reviewer", "name photo")
      .sort({ createdAt: -1 });

    res.json({
      rideId: ride._id,
      driver: {
        _id: ride.driver._id,
        name: ride.driver.username,
        photo: ride.driver.photo,
        rating: ride.driver.rating,
        bio: ride.driver.bio,
        email: ride.driver.email
      },
      car: ride.car ? {
        make: ride.car.make,
        model: ride.car.model,
        year: ride.car.year,
        plateNumber: ride.car.plateNumber,
        seats: ride.car.seats,
        photoUrl: ride.car.photoUrl,
      } : null,
      route: {
        fromCity: ride.fromCity,
        toCity: ride.toCity,
        pickupLocation: ride.pickupLocation,
        dropoffLocation: ride.dropoffLocation,
        pickupTime: ride.pickupTime,
        reachTime: ride.reachTime,
        stops: ride.stops
      },
      seatsAvailable: ride.seatsAvailable,
      pricePerSeat: ride.pricePerSeat,
      preferences: ride.preferences,
      luggage: ride.luggage,
      instructions: ride.instructions,
      bookingMode: ride.bookingMode,
      status: ride.status,
      passengers: ride.bookings.map(b => ({
        id: b.passenger._id,
        name: b.passenger.name,
        photo: b.passenger.photo,
        rating: b.passenger.rating,
        seatsBooked: b.seatsBooked,
        status: b.status
      })),
      reviews
    });
  } catch (err) {
    console.error("getRideDetails error:", err);
    res.status(500).json({ error: err.message });
  }
};

// Book ride (passenger) - supports bookingMode: for 'direct' it will auto-confirm; for 'request' it creates pending booking
export const bookRide = async (req, res) => {
  const rideId = req.params.rideId;
  const seats = parseInt(req.body.seats || 1);

  try {
    // create booking document first (status pending or confirmed depending on bookingMode later)
    const booking = new Booking({
      ride: rideId,
      passenger: req.user.id,
      seatsBooked: seats,
      status: "pending"
    });
    await booking.save();

    // try to decrement seats atomically and attach booking id
    const ride = await Ride.findOneAndUpdate(
      { _id: rideId, seatsAvailable: { $gte: seats }, status: "active" },
      {
        $inc: { seatsAvailable: -seats },
        $push: { bookings: booking._id }
      },
      { new: true }
    );

    if (!ride) {
      // not enough seats or ride not active — rollback booking doc
      await Booking.findByIdAndDelete(booking._id);
      return res.status(400).json({ error: "Not enough seats or ride not available" });
    }

    // set booking status based on ride.bookingMode
    booking.status = ride.bookingMode === "direct" ? "confirmed" : "pending";
    await booking.save();

    // notify driver & passenger...
    res.status(201).json({ booking });
  } catch (err) {
    console.error("bookRide err", err);
    res.status(500).json({ error: err.message });
  }
};

export const rejectBooking = async (req, res) => {
  const { bookingId } = req.params;
  try {
    const booking = await Booking.findById(bookingId).populate('ride');
    if (!booking) return res.status(404).json({ error: "Booking not found" });
    const ride = booking.ride;
    if (ride.driver.toString() !== req.user.id.toString()) return res.status(403).json({ error: "Not authorized" });

    if (booking.status === "cancelled" || booking.status === "rejected") {
      return res.status(400).json({ error: "Booking already cancelled/rejected" });
    }

    booking.status = "cancelled";
    await booking.save();

    // restore seats
    await Ride.findByIdAndUpdate(ride._id, { $inc: { seatsAvailable: booking.seatsBooked } });

    // notify passenger
    sendInAppNotification(req, booking.passenger, { type: "booking_rejected", bookingId });

    res.json({ message: "Booking rejected and seats restored" });
  } catch (err) {
    console.error("rejectBooking err", err);
    res.status(500).json({ error: err.message });
  }
};

export const startRide = async (req, res) => {
  try {
    const { rideId } = req.params;
    const ride = await Ride.findById(rideId).populate({ path: 'bookings', match: { status: { $in: ['confirmed'] } } });
    if (!ride) return res.status(404).json({ error: "Ride not found" });
    if (ride.driver.toString() !== req.user.id.toString()) return res.status(403).json({ error: "Not authorized" });

    ride.status = "ongoing";
    await ride.save();

    // notify passengers
    const passengerIds = ride.bookings.map(b => b.passenger);
    notifyMultipleUsers(req, passengerIds, { type: "ride_started", rideId: ride._id });

    res.json({ message: "Ride started" });
  } catch (err) {
    console.error("startRide err", err);
    res.status(500).json({ error: err.message });
  }
};

export const completeRide = async (req, res) => {
  try {
    const { rideId } = req.params;
    const ride = await Ride.findById(rideId).populate('bookings');
    if (!ride) return res.status(404).json({ error: "Ride not found" });
    if (ride.driver.toString() !== req.user.id.toString()) return res.status(403).json({ error: "Not authorized" });

    ride.status = "completed";
    await ride.save();

    // mark bookings completed (optional)
    await Booking.updateMany({ ride: ride._id, status: "confirmed" }, { $set: { status: "completed" } });

    // notify passengers (ask for reviews)
    const passengerIds = ride.bookings.map(b => b.passenger);
    notifyMultipleUsers(req, passengerIds, { type: "ride_completed", rideId: ride._id });

    res.json({ message: "Ride completed" });
  } catch (err) {
    console.error("completeRide err", err);
    res.status(500).json({ error: err.message });
  }
};

// ✅ List all passengers for a ride (driver only)
export const listPassengers = async (req, res) => {
  try {
    const { rideId } = req.params;
    const driverId = req.user.id;

    const ride = await Ride.findOne({ _id: rideId, driver: driverId })
      .populate({
        path: "bookings.passenger",
        select: "name email phone rating" // choose fields to expose
      });

    if (!ride) {
      return res.status(404).json({ message: "Ride not found or not owned by you" });
    }

    const passengers = ride.bookings
      .filter(b => b.status === "confirmed") // only confirmed passengers
      .map(b => ({
        passenger: b.passenger,
        seatsBooked: b.seats,
        bookingStatus: b.status
      }));

    res.json({ rideId: ride._id, passengers });
  } catch (err) {
    res.status(500).json({ message: "Error fetching passengers", error: err.message });
  }
};


// Cancel booking (passenger)
export const cancelBooking = async (req, res) => {
  try {
    const { rideId } = req.params;
    const booking = await Booking.findOneAndUpdate(
      { ride: rideId, passenger: req.user.id, status: { $ne: "cancelled" } },
      { status: "cancelled" },
      { new: true }
    );

    if (!booking) return res.status(404).json({ error: "Booking not found or already cancelled" });

    // return seats
    const ride = await Ride.findById(rideId);
    if (ride) {
      ride.seatsAvailable += booking.seatsBooked;
      await ride.save();
    }

    // notify driver
    sendInAppNotification(req, ride.driver, {
      type: "booking_cancelled",
      rideId: ride._id,
      bookingId: booking._id,
      message: `${req.user.name} cancelled their booking.`
    });

    res.json({ booking });
  } catch (err) {
    console.error("cancelBooking error:", err);
    res.status(500).json({ error: err.message });
  }
};

// List passenger's own bookings
export const listMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ passenger: req.user.id })
      .populate({
        path: "ride",
        populate: { path: "driver", select: "name photo rating" }
      })
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (err) {
    console.error("listMyBookings error:", err);
    res.status(500).json({ error: err.message });
  }
};



// Leave review (passenger -> driver)
export const leaveReview = async (req, res) => {
  try {
    const { rideId } = req.params;
    const { rating, comment } = req.body;

    const ride = await Ride.findById(rideId);
    if (!ride) return res.status(404).json({ error: "Ride not found" });

    const review = new Review({
      ride: rideId,
      reviewer: req.user.id,
      reviewee: ride.driver,
      rating,
      comment
    });
    await review.save();

    // optionally update driver's aggregate rating here

    res.status(201).json(review);
  } catch (err) {
    console.error("leaveReview error:", err);
    res.status(500).json({ error: err.message });
  }
};

// List driver's rides
export const listMyRides = async (req, res) => {
  try {
    const rides = await Ride.find({ driver: req.user.id })
      .populate("bookings")
      .sort({ pickupTime: -1 });
    res.json(rides);
  } catch (err) {
    console.error("listMyRides error:", err);
    res.status(500).json({ error: err.message });
  }
};
