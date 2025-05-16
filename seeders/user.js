import { User } from "../models/user.js";
import { faker } from "@faker-js/faker";

// Function to create a specified number of users
const createUser = async (Numusers) => {
    try {
        // Array to store promises of user creation
        const usersPromise = [];
        // Loop to create the specified number of users
        for (let i = 0; i < Numusers; i++) {
            // Create a user with faker data
            const tempUser = User.create({
                name: faker.person.fullName(), // Updated method
                email: faker.internet.email(),
                username: faker.internet.userName(),
                password: "password",
                avatar: {
                    url: faker.image.avatar(),
                    public_id: faker.system.fileName(),
                    
                },
                bio: faker.lorem.sentence(10),
               
            });
            
            // Push the promise of user creation to the array
            usersPromise.push(tempUser);
        }
        // Wait for all user creation promises to resolve
        await Promise.all(usersPromise);
        console.log("users created", Numusers);
        
    } catch (error) {
        // Log any errors that occur
        console.log(error);
        // Exit the process with a status code of 1
        process.exit(1);
    }
};

// Export the createUser function
export { createUser };

    