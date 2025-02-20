import { Link } from "react-router-dom";
import { projects } from "../data/projects";

const ProjectList = () => {
  return (
    <div className="container">
      <h2 className="text-2xl font-bold mb-4">Projects</h2>
      <ul className="space-y-3">
        {projects.map((project) => (
          <li key={project.id} className="p-4 bg-white shadow rounded-md">
            <Link to={`/project/${project.id}`} className="text-blue-500 font-semibold">
              {project.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ProjectList;
