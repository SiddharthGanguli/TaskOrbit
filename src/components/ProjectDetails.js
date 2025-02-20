import { useParams } from "react-router-dom";
import { projects } from "../data/projects";
import ProgressTracker from "./ProgressTracker";
import Whiteboard from "./Whiteboard";

const ProjectDetails = () => {
  const { id } = useParams();
  const project = projects.find((p) => p.id === parseInt(id));

  if (!project) return <div>Project not found</div>;

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold">{project.name}</h2>
      <p>{project.description}</p>
      <Whiteboard />
      <ProgressTracker progress={project.progress} />
    </div>
  );
};

export default ProjectDetails;
