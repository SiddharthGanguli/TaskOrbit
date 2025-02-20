const ProgressTracker = ({ progress }) => {
    return (
      <div className="mt-4">
        <h3 className="text-lg font-bold">Progress</h3>
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div
            className="bg-blue-500 h-4 rounded-full"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <p>{progress}% completed</p>
      </div>
    );
  };
  
  export default ProgressTracker;
  