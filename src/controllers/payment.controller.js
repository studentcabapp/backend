import Payment from "../models/payment.model.js";

export const initiatePayment = async (req, res) => {
  const { rideId } = req.params;
  const { amount, method } = req.body;
  const payment = new Payment({ booking: rideId, amount, method });
  await payment.save();
  res.status(201).json({ paymentId: payment._id, status: "pending" });
};

export const handlePaymentWebhook = async (req, res) => {
  const { paymentId, status, transactionId } = req.body;
  const payment = await Payment.findByIdAndUpdate(paymentId, { status, transactionId }, { new: true });
  res.json(payment);
};
