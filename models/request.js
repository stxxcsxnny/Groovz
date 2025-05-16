import mongoose, { Schema, Types, model } from "mongoose";

const userSchema = new Schema(
  {
    status: {
      type: String,
      default: "pending",
      enum: ["pending", "approved", "rejected"],
    },
    sender: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiver: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
); 

export default mongoose.models.Request || model("Request", userSchema);
