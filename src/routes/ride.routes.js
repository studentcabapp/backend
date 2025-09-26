import express from "express";
import { verifyToken, requireRoles } from "../middlewares/auth.middleware.js";
import * as rideCtrl from "../controllers/ride.controller.js";
import * as chatCtrl from "../controllers/chat.controller.js";
import * as carCtrl from "../controllers/car.controller.js";
// import * as paymentCtrl from "../controllers/payment.controller.js";

const router = express.Router();

// Passenger
router.get("/rider/search", verifyToken, requireRoles('user','admin'), rideCtrl.searchRides);                           // done    // search rides
router.get("/rider/me/bookings", verifyToken, requireRoles('user','admin'), rideCtrl.listMyBookings);                   // done    // passenger's bookings
router.get("/rider/details/:id", verifyToken, rideCtrl.driverDetails);                                           // done    // get driver details
router.get("/rider/:rideId", verifyToken, requireRoles('user','admin'), rideCtrl.getRideDetails);                       // done    // ride details
router.post("/rider/:rideId/book", verifyToken, requireRoles('user','admin'), rideCtrl.bookRide);                       // done    // book ride
router.post("/rider/:rideId/cancel", verifyToken, requireRoles('user','admin'), rideCtrl.cancelBooking);                // done    // cancel booking
// router.post("/:rideId/verify-otp", verifyToken, rideCtrl.verifyRideOtp);                                                        // verify OTP after ride
router.post("/rider/:rideId/review", verifyToken, requireRoles('user','admin'), rideCtrl.leaveReview);                  //         // review driver


// Car management
router.get("/cars/test", carCtrl.testcar);                                 // test car route                            // done
router.post("/cars", verifyToken, requireRoles('user','admin'), carCtrl.createCar);                                     // done
router.get("/cars", verifyToken, requireRoles('user','admin'), carCtrl.listCars);                                       // done
router.put("/cars/:carId", verifyToken, requireRoles('user','admin'), carCtrl.updateCar);                               // done
router.delete("/cars/:carId", verifyToken, requireRoles('user','admin'), carCtrl.deleteCar);                            // done

// Driver
router.post("/ride/create", verifyToken, requireRoles('user','admin'), rideCtrl.createRide);                            // create ride          // done
router.put("/ride/:rideId/update", verifyToken, requireRoles('user','admin'), rideCtrl.updateRide);                     // update ride          // done
router.delete("/ride/:rideId/delete", verifyToken, requireRoles('user','admin'), rideCtrl.deleteRide);                  // delete ride          // 
router.post("/ride/:rideId/confirm/:bookingId", verifyToken, requireRoles('user','admin'), rideCtrl.confirmBooking);    // confirm booking      //
router.get("/ride/myRides", verifyToken, requireRoles('user','admin'), rideCtrl.listMyRides);                           // list my rides        // done

// Driver actions 
router.post("/driver/:rideId/start", verifyToken, requireRoles('user','admin'), rideCtrl.startRide);                    //  done  // start ride
router.post("/driver/:rideId/complete", verifyToken, requireRoles('user','admin'), rideCtrl.completeRide);              //  done  // complete ride
router.get("/driver/:rideId/passengers", verifyToken, requireRoles('user','admin'), rideCtrl.listPassengers);           //  done  // list passengers
router.post("/driver/:rideId/reject/:bookingId", verifyToken, requireRoles('user','admin'), rideCtrl.rejectBooking);    //

// Chat
router.get("/:rideId/chat", verifyToken, chatCtrl.getMessages);             // get chat messages
router.post("/:rideId/chat", verifyToken, chatCtrl.sendMessage);            // send chat message

// // Payment
// router.post("/:rideId/pay", verifyToken, paymentCtrl.initiatePayment);
// router.post("/:rideId/payment-callback", paymentCtrl.handlePaymentWebhook);

export default router;