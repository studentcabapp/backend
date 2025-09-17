// src/controllers/car.controller.js
import Car from "../models/car.model.js";

// ✅ Create a new car

export const testcar = async (req, res) => {
    res.status(201).json({ message: "Car test",  });
};

export const createCar = async (req, res) => {
  try {
    const { make, model, year, plateNumber, seats, color, ac, photoUrl } = req.body;
    const owner = req.user.id;

    const car = new Car({
      owner,
      make,
      model,
      year,
      plateNumber,
      seats,
      color,
      ac,
      photoUrl
    });

    await car.save();
    res.status(201).json({ message: "Car created successfully", car });
  } catch (err) {
    res.status(500).json({ message: "Error creating car", error: err.message });
  }
};

// ✅ List all cars owned by driver
export const listCars = async (req, res) => {
  try {
    const owner = req.user.id;
    const cars = await Car.find({ owner });
    res.json({ cars });
  } catch (err) {
    res.status(500).json({ message: "Error fetching cars", error: err.message });
  }
};

// ✅ Update car details
export const updateCar = async (req, res) => {
  try {
    const { carId } = req.params;
    const owner = req.user.id;

    const car = await Car.findOneAndUpdate(
      { _id: carId, owner },
      { $set: req.body },
      { new: true }
    );

    if (!car) {
      return res.status(404).json({ message: "Car not found or not owned by you" });
    }

    res.json({ message: "Car updated successfully", car });
  } catch (err) {
    res.status(500).json({ message: "Error updating car", error: err.message });
  }
};

// ✅ Delete a car
export const deleteCar = async (req, res) => {
  try {
    const { carId } = req.params;
    const owner = req.user.id;

    const car = await Car.findOneAndDelete({ _id: carId, owner });

    if (!car) {
      return res.status(404).json({ message: "Car not found or not owned by you" });
    }

    res.json({ message: "Car deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting car", error: err.message });
  }
};
