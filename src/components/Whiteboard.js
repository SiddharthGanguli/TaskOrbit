const Whiteboard = () => {
    return (
      <div className="mt-4 p-4 border rounded h-40 bg-gray-100">
        <h3 className="text-lg font-bold">Whiteboard</h3>
        <textarea
          className="w-full h-full p-2 border rounded"
          placeholder="Write your ideas here..."
        ></textarea>
      </div>
    );
  };
  
  export default Whiteboard;
  