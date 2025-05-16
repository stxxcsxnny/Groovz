class ErrorHandler extends Error {
  // Create a constructor function that takes in a message and a statusCode as parameters
  constructor(message, statusCode) {
    // Call the constructor of the parent class (Error) with the message parameter
    super(message);
    // Set the statusCode property of the instance to the statusCode parameter
    this.statusCode = statusCode;
  }
}
export { ErrorHandler };
