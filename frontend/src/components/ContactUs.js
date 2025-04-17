import React from "react";
import { Mail, Phone, User, MessageCircle } from "lucide-react"; // Import icons

function ContactUs() {
  return (
    <>
      <div className="min-h-[80vh] flex items-center justify-center bg-gradient-to-r from-blue-50 to-purple-50 p-6">
        <div className="w-full max-w-2xl bg-white p-8 rounded-xl shadow-lg">
          <h1 className="text-3xl font-bold text-purple-700 text-center mb-6 mt-16 lg:mt-0">
            Contact Us
          </h1>
          <div className="flex flex-col md:flex-row">
            <div className="md:w-1/2 mb-6 md:mb-0">
              <img
                src="/contactus.jpg"
                alt="Contact Us"
                className="rounded-lg mx-auto"
              />
            </div>
            <div className="md:w-1/2">
              <form>
                <div className="mb-4 flex items-center border border-gray-300 rounded-lg">
                  <User className="w-5 h-5 text-gray-500 ml-3" />
                  <input
                    id="name"
                    type="text"
                    placeholder="Enter your name"
                    required
                    className="w-full p-3 border-0 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div className="mb-4 flex items-center border border-gray-300 rounded-lg">
                  <Mail className="w-5 h-5 text-gray-500 ml-3" />
                  <input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    required
                    className="w-full p-3 border-0 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div className="mb-4 flex items-center border border-gray-300 rounded-lg">
                  <Phone className="w-5 h-5 text-gray-500 ml-3" />
                  <input
                    id="phone"
                    type="tel"
                    placeholder="Enter your phone number"
                    required
                    className="w-full p-3 border-0 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div className="mb-4 flex items-center border border-gray-300 rounded-lg">
                  <MessageCircle className="w-5 h-5 text-gray-500 ml-3" />
                  <textarea
                    id="message"
                    placeholder="Your message here"
                    required
                    className="w-full p-3 border-0 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-purple-700 text-white py-3 rounded-lg hover:bg-purple-800 transition duration-300 shadow-lg hover:shadow-xl"
                >
                  Submit
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default ContactUs;
