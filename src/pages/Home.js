import { Link } from "react-router-dom";

const Home = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white">
      {/* Logo & Title */}
      <h1 className="text-4xl md:text-5xl font-extrabold mb-6 animate-fadeIn">
        🚀 Project Management
      </h1>

      {/* Subtitle */}
      <p className="text-lg md:text-xl mb-8 text-center max-w-xl animate-fadeIn delay-200">
        Collaborate with your team, track progress, and bring ideas to life!
      </p>

      {/* Button to Dashboard */}
      <Link
        to="/dashboard"
        className="px-6 py-3 bg-white text-indigo-600 font-semibold text-lg rounded-lg shadow-lg hover:bg-gray-200 transition duration-300 animate-fadeIn delay-400"
      >
        Go to Dashboard →
      </Link>
    </div>
  );
};

export default Home;
