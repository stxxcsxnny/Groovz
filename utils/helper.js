import { userSocketIDS } from "../app.js";

// Export a function called getOtherMembers that takes in two parameters: members and userId
export const getOtherMembers = (members, userId) => {
  // Return a new array of members that do not have the same _id as the userId
  return members.filter(
    (member) => member._id.toString() !== userId.toString()
  );
};



export const getSockets = (members = []) => {
  const sockets = [];

  members.forEach((member) => {
    const id =
      typeof member === "string"
        ? member
        : member?._id?.toString?.();

    if (!id) {
      console.warn("[getSockets] Invalid member entry:", member);
      return;
    }

    const socketIds = userSocketIDS.get(id);

    if (!socketIds) {
      console.warn(`[getSockets] No socket ID found for user ${id}`);
      return;
    }

    sockets.push(...socketIds);
  });

  return sockets;
};

export const getBase64 = (file) => {
  const mimeType = file.mimetype; // like image/png
  const base64 = file.buffer.toString("base64");
  return `data:${mimeType};base64,${base64}`;
};
