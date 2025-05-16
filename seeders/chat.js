import chat from "../models/chat.js";
import message from "../models/message.js";
import { User } from "../models/user.js";
import { faker, simpleFaker } from "@faker-js/faker";

const createSampleChat = async (num_chats) => {
    try {
        const users = await User.find().select("_id");
        const chatsPromise = [];

        for (let i = 0; i < users.length; i++) {
            for (let j = i + 1; j < users.length; j++) {
                chatsPromise.push(
                    chat.create({
                        name: faker.lorem.words(2),
                        members: [users[i], users[j]],
                    })
                );
            }
        }

        await Promise.all(chatsPromise);
        console.log("Chats created successfully");
    } catch (error) {
        console.log(error);
    }
};

const createGroupChat = async (num_chats) => {
    try {
        const users = await User.find().select("_id");
        const chatsPromise = [];

        for (let i = 0; i < num_chats; i++) {
            const numMembers = simpleFaker.number.int({ min: 2, max: users.length });
            const members = [];

            for (let j = 0; j < numMembers; j++) {
                const randomIndex = Math.floor(Math.random() * users.length);
                const randomUser = users[randomIndex];

                if (!members.includes(randomUser)) {
                    members.push(randomUser);
                }
            }

            chatsPromise.push(
                chat.create({
                    groupChat: true,
                    name: faker.lorem.words(2),
                    members: members,
                    creator: members[0],
                })
            );
        }

        await Promise.all(chatsPromise);
        console.log("Chats created successfully");
        process.exit(1);
    } catch (error) {
        console.log(error);
        process.exit(1);
    }
};

const createSampleMessages = async (num_messages) => {
    try {
        const chats = await chat.find().select("_id");
        const users = await User.find().select("_id");
        const messagesPromise = [];

        for (let i = 0; i < num_messages; i++) {
            const randomUser = users[Math.floor(Math.random() * users.length)];
            const randomChat = chats[Math.floor(Math.random() * chats.length)];

            messagesPromise.push(
                message.create({
                    chat: randomChat,
                    sender: randomUser,
                    text: faker.lorem.sentence(),
                })
            );
        }

        await Promise.all(messagesPromise);
        console.log("Messages created successfully");
    } catch (error) {
        console.log(error);
        process.exit(1);
    }
};

const createMessageInAChat = async (chatId, num_messages) => {
    try {
        const users = await User.find().select("_id");
        const messagesPromise = [];

        for (let i = 0; i < num_messages; i++) {
            const randomUser = users[Math.floor(Math.random() * users.length)];

            messagesPromise.push(
                message.create({
                    chat: chatId,
                    sender: randomUser,
                    text: faker.lorem.sentence(),
                })
            );
        }

        await Promise.all(messagesPromise);
        console.log("Messages created successfully");
    } catch (error) {
        console.log(error);
        process.exit(1);
    }
};

export {
    createSampleChat,
    createGroupChat,
    createSampleMessages,
    createMessageInAChat
};
