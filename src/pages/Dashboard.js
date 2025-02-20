import React, { useState, useEffect } from "react";
import { auth, db } from "../firebaseConfig";
import { signOut } from "firebase/auth";
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  arrayUnion,
  arrayRemove,
  deleteDoc
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(localStorage.getItem("darkMode") === "true");
  const [userName, setUserName] = useState("");
  const [userUsername, setUserUsername] = useState("");
  const [projects, setProjects] = useState([]);
  const [newProject, setNewProject] = useState({ name: "", description: "" });
  const [newMember, setNewMember] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedProject, setSelectedProject] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [whiteboardText, setWhiteboardText] = useState("");
  const [updates, setUpdates] = useState([]);
  const [progress, setProgress] = useState(0);
  const [resources, setResources] = useState([]);
  const [projectMembers, setProjectMembers] = useState([]);
  const [newResourceText, setNewResourceText] = useState("");
  const [newUpdateText, setNewUpdateText] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // [Previous fetch functions remain unchanged...]
  const fetchProjects = async () => {
    if (!auth.currentUser) return;
    try {
      const projectsRef = collection(db, "projects");
      const projectsSnap = await getDocs(projectsRef);
      const userProjects = projectsSnap.docs
        .filter(doc => doc.data().members.includes(auth.currentUser.uid))
        .map(doc => ({ id: doc.id, ...doc.data() }));
      setProjects(userProjects);
      if (userProjects.length > 0 && !selectedProjectId) {
        setSelectedProjectId(userProjects[0].id);
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
    }
  };

  const fetchNotifications = async () => {
    if (!auth.currentUser) return;
    try {
      const notificationRef = doc(db, "notifications", auth.currentUser.uid);
      const notificationSnap = await getDoc(notificationRef);

      if (notificationSnap.exists()) {
        const invitations = notificationSnap.data().invitations || [];
        const enrichedInvitations = await Promise.all(
          invitations.map(async (invite) => {
            if (!invite.projectId || typeof invite.projectId !== "string") {
              return { ...invite, projectName: "Invalid Project", senderUsername: "Unknown User" };
            }
            const projectRef = doc(db, "projects", invite.projectId);
            const projectSnap = await getDoc(projectRef);
            const projectName = projectSnap.exists() ? projectSnap.data().name : "Unknown Project";

            const senderRef = doc(db, "users", invite.sender);
            const senderSnap = await getDoc(senderRef);
            const senderUsername = senderSnap.exists() ? senderSnap.data().username : "Unknown User";

            return { ...invite, projectName, senderUsername };
          })
        );
        setNotifications(enrichedInvitations);
      } else {
        setNotifications([]);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  const fetchProjectDetails = async (projectId) => {
    try {
      const projectRef = doc(db, "projects", projectId);
      const projectSnap = await getDoc(projectRef);
      if (projectSnap.exists()) {
        const data = projectSnap.data();
        setSelectedProject({ id: projectId, ...data });
        setWhiteboardText(data.whiteboard || "");
        setUpdates(data.updates || []);
        setProgress(data.progress || 0);
        setResources(data.resources || []);

        const members = data.members || [];
        const memberDocs = await Promise.all(
          members.map(async (uid) => {
            const userRef = doc(db, "users", uid);
            const userSnap = await getDoc(userRef);
            return userSnap.exists() ? { uid, username: userSnap.data().username } : { uid, username: "Unknown" };
          })
        );
        setProjectMembers(memberDocs);
      }
    } catch (error) {
      console.error("Error fetching project details:", error);
    }
  };

  useEffect(() => {
    localStorage.setItem("darkMode", darkMode);
    document.documentElement.classList.toggle("dark", darkMode);

    if (auth.currentUser) {
      const fetchUserInfo = async () => {
        const userRef = doc(db, "users", auth.currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setUserName(userSnap.data().name);
          setUserUsername(userSnap.data().username);
        }
      };
      fetchUserInfo();
      fetchProjects();
      fetchNotifications();
    }
  }, [darkMode, fetchProjects, fetchNotifications]);

  // [Previous handler functions remain mostly unchanged...]
  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  const handleCreateProject = async () => {
    if (!newProject.name.trim()) {
      alert("Project name is required!");
      return;
    }

    try {
      const projectRef = doc(collection(db, "projects"));
      const projectId = projectRef.id;

      await setDoc(projectRef, {
        id: projectId,
        name: newProject.name,
        description: newProject.description,
        members: [auth.currentUser.uid],
        creator: auth.currentUser.uid,
        whiteboard: "",
        updates: [],
        progress: 0,
        resources: []
      });

      setProjects([...projects, { ...newProject, id: projectId, members: [auth.currentUser.uid], creator: auth.currentUser.uid }]);
      setNewProject({ name: "", description: "" });
      setIsSidebarOpen(false);

      alert("Project created successfully!");
    } catch (error) {
      console.error("Error creating project:", error);
    }
  };

  const handleAddMember = async () => {
    if (!newMember.trim() || !selectedProjectId) {
      alert("Please enter a valid username and select a project!");
      return;
    }

    try {
      const usersRef = collection(db, "users");
      const usersSnapshot = await getDocs(usersRef);
      const userDoc = usersSnapshot.docs.find(doc => doc.data().username === newMember);

      if (!userDoc) {
        alert("User not found!");
        return;
      }

      const userId = userDoc.id;
      const selectedProject = projects.find(project => project.id === selectedProjectId);
      if (!selectedProject) {
        alert("Error: Selected project not found!");
        return;
      }

      const notificationRef = doc(db, "notifications", userId);
      const notificationSnap = await getDoc(notificationRef);

      const invitation = {
        projectId: selectedProject.id,
        sender: auth.currentUser.uid,
        status: "pending"
      };

      if (notificationSnap.exists()) {
        await updateDoc(notificationRef, {
          invitations: arrayUnion(invitation)
        });
      } else {
        await setDoc(notificationRef, { invitations: [invitation] });
      }

      alert(`Invitation sent to ${newMember} for project "${selectedProject.name}"!`);
      setNewMember("");
      setIsSidebarOpen(false);
    } catch (error) {
      console.error("Error adding member:", error);
    }
  };

  const handleAcceptInvite = async (projectId) => {
    if (!projectId) {
      alert("Error: Project ID is missing!");
      return;
    }

    try {
      const projectRef = doc(db, "projects", projectId);
      await updateDoc(projectRef, {
        members: arrayUnion(auth.currentUser.uid)
      });

      const notificationRef = doc(db, "notifications", auth.currentUser.uid);
      const notificationSnap = await getDoc(notificationRef);

      if (notificationSnap.exists()) {
        const updatedInvitations = notificationSnap.data().invitations.filter(
          (invite) => invite.projectId !== projectId
        );
        await updateDoc(notificationRef, { invitations: updatedInvitations });
      }

      alert("You have joined the project!");
      fetchProjects();
      fetchNotifications();
      setIsSidebarOpen(false);
    } catch (error) {
      console.error("Error accepting invitation:", error);
    }
  };

  const handleDeclineInvite = async (projectId) => {
    if (!projectId) {
      alert("Error: Project ID is missing!");
      return;
    }

    try {
      const notificationRef = doc(db, "notifications", auth.currentUser.uid);
      const notificationSnap = await getDoc(notificationRef);

      if (notificationSnap.exists()) {
        const updatedInvitations = notificationSnap.data().invitations.filter(
          (invite) => invite.projectId !== projectId
        );
        await updateDoc(notificationRef, { invitations: updatedInvitations });
      }

      alert("Invitation declined!");
      fetchNotifications();
      setIsSidebarOpen(false);
    } catch (error) {
      console.error("Error declining invitation:", error);
    }
  };

  const handleProjectClick = (projectId) => {
    fetchProjectDetails(projectId);
    setIsSidebarOpen(false);
  };

  const handleWhiteboardUpdate = async (e) => {
    const newText = e.target.value;
    setWhiteboardText(newText);
    try {
      const projectRef = doc(db, "projects", selectedProject.id);
      await updateDoc(projectRef, { whiteboard: newText });
    } catch (error) {
      console.error("Error updating whiteboard:", error);
    }
  };

  const handleAddUpdate = async () => {
    if (!newUpdateText.trim()) return;
    const newUpdate = { text: newUpdateText, user: userUsername, timestamp: new Date().toISOString() };
    const updatedUpdates = [...updates, newUpdate];
    setUpdates(updatedUpdates);
    setNewUpdateText("");
    try {
      const projectRef = doc(db, "projects", selectedProject.id);
      await updateDoc(projectRef, { updates: updatedUpdates });
    } catch (error) {
      console.error("Error adding update:", error);
    }
  };

  const handleDeleteUpdate = async (index) => {
    if (selectedProject.creator !== auth.currentUser.uid) return;
    const updatedUpdates = updates.filter((_, i) => i !== index);
    setUpdates(updatedUpdates);
    try {
      const projectRef = doc(db, "projects", selectedProject.id);
      await updateDoc(projectRef, { updates: updatedUpdates });
    } catch (error) {
      console.error("Error deleting update:", error);
    }
  };

  const handleProgressUpdate = async (newProgress) => {
    setProgress(newProgress);
    try {
      const projectRef = doc(db, "projects", selectedProject.id);
      await updateDoc(projectRef, { progress: newProgress });
    } catch (error) {
      console.error("Error updating progress:", error);
    }
  };

  const handleAddResource = async () => {
    if (!newResourceText.trim() || selectedProject.creator !== auth.currentUser.uid) return;
    const newResource = { text: newResourceText, addedBy: userUsername, timestamp: new Date().toISOString() };
    const updatedResources = [...resources, newResource];
    setResources(updatedResources);
    setNewResourceText("");
    try {
      const projectRef = doc(db, "projects", selectedProject.id);
      await updateDoc(projectRef, { resources: updatedResources });
    } catch (error) {
      console.error("Error adding resource:", error);
    }
  };

  const handleDeleteResource = async (index) => {
    if (selectedProject.creator !== auth.currentUser.uid) return;
    const updatedResources = resources.filter((_, i) => i !== index);
    setResources(updatedResources);
    try {
      const projectRef = doc(db, "projects", selectedProject.id);
      await updateDoc(projectRef, { resources: updatedResources });
    } catch (error) {
      console.error("Error deleting resource:", error);
    }
  };

  const handleKickMember = async (memberUid) => {
    if (selectedProject.creator !== auth.currentUser.uid) return;
    if (memberUid === auth.currentUser.uid) {
      alert("You cannot kick yourself!");
      return;
    }
    if (!window.confirm(`Are you sure you want to remove this member from ${selectedProject.name}?`)) return;

    try {
      const projectRef = doc(db, "projects", selectedProject.id);
      await updateDoc(projectRef, {
        members: arrayRemove(memberUid)
      });
      alert("Member removed from the project!");
      fetchProjectDetails(selectedProject.id);
    } catch (error) {
      console.error("Error kicking member:", error);
    }
  };

  const handleDeleteProject = async () => {
    if (selectedProject.creator !== auth.currentUser.uid) return;
    if (!window.confirm("Are you sure you want to delete this project? This action cannot be undone.")) return;

    try {
      const projectRef = doc(db, "projects", selectedProject.id);
      await deleteDoc(projectRef);
      alert("Project deleted successfully!");
      setSelectedProject(null);
      fetchProjects();
    } catch (error) {
      console.error("Error deleting project:", error);
    }
  };
  
  const isUrl = (text) => {
    try {
      new URL(text);
      return true;
    } catch (_) {
      return false;
    }
  };

  return (
    <div className={`h-screen ${darkMode ? "bg-gray-900 text-white" : "bg-gray-100 text-black"} flex flex-col overflow-hidden`}>
      {/* Navbar */}
      <nav className="bg-primary p-4 flex justify-between items-center shadow-md sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button 
            className="md:hidden text-white text-2xl"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            ☰
          </button>
          <div className="w-10 h-10 bg-gray-300 dark:bg-gray-700 rounded-full flex items-center justify-center text-xl">
            👤
          </div>
          <div className="hidden sm:block">
            <h2 className="text-xl font-semibold">{userName}</h2>
            <p className="text-sm text-gray-400">@{userUsername}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <button 
            onClick={() => setDarkMode(!darkMode)} 
            className="px-2 py-1 sm:px-4 sm:py-2 bg-secondary text-white rounded-lg hover:scale-105"
          >
            {darkMode ? "🌞 Light Mode" : "🌙 Dark Mode"}
          </button>
          <button 
            onClick={handleLogout} 
            className="px-2 py-1 sm:px-4 sm:py-2 bg-red-500 text-white rounded-lg hover:scale-105"
          >
            Logout
          </button>
        </div>
      </nav>

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside 
          className={`
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
            md:translate-x-0 fixed top-16 left-0 w-64 h-[calc(100vh-4rem)] 
            bg-gray-200 dark:bg-gray-800 p-4 transition-transform duration-300 
            z-10 md:z-0 md:static
          `}
        >
          <h3 className="text-lg font-bold mb-4">📂 Project Manager</h3>
          <ul className="mt-4 space-y-3">
            <li 
              className="p-2 bg-gray-300 dark:bg-gray-700 rounded-md cursor-pointer hover:bg-gray-400 dark:hover:bg-gray-600"
              onClick={handleCreateProject}
            >
              📁 Create Project
            </li>
            <li 
              className="p-2 bg-gray-300 dark:bg-gray-700 rounded-md cursor-pointer hover:bg-gray-400 dark:hover:bg-gray-600"
              onClick={handleAddMember}
            >
              👥 Add Members
            </li>
            <li className="p-2 bg-gray-300 dark:bg-gray-700 rounded-md cursor-pointer hover:bg-gray-400 dark:hover:bg-gray-600">
              🔔 Notifications ({notifications.length})
            </li>
          </ul>
        </aside>

        {/* Mobile overlay */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-0 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6 md:ml-64 overflow-y-auto">
          {!selectedProject ? (
            <>
              {/* Create Project */}
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md mb-6">
                <h2 className="text-xl font-bold mb-2">📁 Create a New Project</h2>
                <input
                  type="text"
                  placeholder="Project Name"
                  className="w-full p-2 border rounded-md dark:bg-gray-700 mb-2"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                />
                <textarea
                  placeholder="Project Description"
                  className="w-full p-2 border rounded-md dark:bg-gray-700 mb-2"
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  rows="3"
                />
                <button 
                  className="mt-2 w-full md:w-auto px-4 py-2 bg-primary text-white rounded-md hover:scale-105"
                  onClick={handleCreateProject}
                >
                  Create
                </button>
              </div>

              {/* Add Members */}
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md mb-6">
                <h2 className="text-xl font-bold mb-2">👥 Add Members</h2>
                <select
                  className="w-full p-2 border rounded-md dark:bg-gray-700 mb-2"
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  disabled={projects.length === 0}
                >
                  {projects.length === 0 ? (
                    <option value="">No projects available</option>
                  ) : (
                    projects.map(project => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))
                  )}
                </select>
                <input
                  type="text"
                  placeholder="Username"
                  className="w-full p-2 border rounded-md dark:bg-gray-700 mb-2"
                  value={newMember}
                  onChange={(e) => setNewMember(e.target.value)}
                />
                <button 
                  className="w-full md:w-auto px-4 py-2 bg-primary text-white rounded-md hover:scale-105"
                  onClick={handleAddMember}
                >
                  Invite
                </button>
              </div>

              {/* Project List */}
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md mb-6">
                <h2 className="text-xl font-bold mb-2">📂 Your Projects</h2>
                {projects.length === 0 ? (
                  <p>No projects yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {projects.map(project => (
                      <li
                        key={project.id}
                        className="p-2 bg-gray-100 dark:bg-gray-700 rounded-md cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600"
                        onClick={() => handleProjectClick(project.id)}
                      >
                        <h3 className="font-semibold">{project.name}</h3>
                        <p className="text-sm truncate">{project.description || "No description"}</p>
                        <p className="text-sm text-gray-500">Members: {project.members.length}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Notifications */}
              {notifications.length > 0 && (
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md mb-6">
                  <h2 className="text-xl font-bold mb-2">🔔 Invitations</h2>
                  {notifications.map((invite, index) => (
                    <div key={index} className="mb-2 flex flex-col sm:flex-row items-start sm:items-center gap-2">
                      <p className="flex-1 truncate">
                        Invitation to join <strong>{invite.projectName}</strong> by @{invite.senderUsername}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAcceptInvite(invite.projectId)}
                          className="px-2 py-1 bg-green-500 text-white rounded-md hover:scale-105"
                        >
                          ✅ Accept
                        </button>
                        <button
                          onClick={() => handleDeclineInvite(invite.projectId)}
                          className="px-2 py-1 bg-red-500 text-white rounded-md hover:scale-105"
                        >
                          ❌ Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
              <button
                onClick={() => setSelectedProject(null)}
                className="mb-4 px-4 py-2 bg-gray-500 text-white rounded-md hover:scale-105"
              >
                Back to Dashboard
              </button>
              <h2 className="text-2xl font-bold mb-4">{selectedProject.name}</h2>
              {selectedProject.creator === auth.currentUser.uid && (
                <button
                  onClick={handleDeleteProject}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:scale-105 mb-4"
                >
                  Delete Project
                </button>
              )}

              {/* Members Section */}
              <div className="mb-6">
                <h3 className="text-xl font-semibold mb-2">👥 Members</h3>
                <div className="flex flex-wrap gap-2">
                  {projectMembers.map((member) => (
                    <span
                      key={member.uid}
                      className="px-3 py-1 bg-blue-500 text-white rounded-full text-sm flex items-center gap-1"
                    >
                      <span className="w-6 h-6 bg-gray-300 dark:bg-gray-700 rounded-full flex items-center justify-center">👤</span>
                      <span className="truncate max-w-[150px]">@{member.username}</span>
                      {selectedProject.creator === auth.currentUser.uid && member.uid !== auth.currentUser.uid && (
                        <button
                          onClick={() => handleKickMember(member.uid)}
                          className="ml-2 px-2 py-0.5 bg-red-600 text-white rounded-full text-xs hover:bg-red-700"
                        >
                          Remove
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              </div>

              {/* Whiteboard */}
              <div className="mb-6">
                <h3 className="text-xl font-semibold mb-2">📝 Whiteboard</h3>
                <textarea
                  className="w-full p-2 border rounded-md dark:bg-gray-700"
                  value={whiteboardText}
                  onChange={handleWhiteboardUpdate}
                  placeholder="Discuss project details here..."
                  rows="6"
                />
              </div>

              {/* Project Updates */}
              <div className="mb-6">
                <h3 className="text-xl font-semibold mb-2">🔔 Project Updates</h3>
                <ul className="space-y-2">
                  {updates.map((update, index) => (
                    <li 
                      key={index} 
                      className="p-2 bg-gray-100 dark:bg-gray-700 rounded-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2"
                    >
                      <p className="break-words flex-1">
                        {update.text} - <strong>{update.user}</strong> 
                        <span className="text-gray-500"> ({new Date(update.timestamp).toLocaleString()})</span>
                      </p>
                      {selectedProject.creator === auth.currentUser.uid && (
                        <button
                          onClick={() => handleDeleteUpdate(index)}
                          className="px-2 py-1 bg-red-600 text-white rounded-md hover:scale-105"
                        >
                          Delete
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
                <div className="mt-2 flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    placeholder="Add an update..."
                    className="w-full p-2 border rounded-md dark:bg-gray-700"
                    value={newUpdateText}
                    onChange={(e) => setNewUpdateText(e.target.value)}
                  />
                  <button
                    onClick={handleAddUpdate}
                    className="px-4 py-2 bg-primary text-white rounded-md hover:scale-105 whitespace-nowrap"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Progress */}
              <div className="mb-6">
                <h3 className="text-xl font-semibold mb-2">📊 Progress</h3>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={progress}
                  onChange={(e) => handleProgressUpdate(Number(e.target.value))}
                  className="w-full"
                />
                <p>{progress}% Complete</p>
              </div>

              {/* Resources */}
              <div className="mb-6">
                <h3 className="text-xl font-semibold mb-2">📚 Resources</h3>
                <ul className="space-y-3">
                  {resources.map((resource, index) => (
                    <li 
                      key={index} 
                      className="p-4 bg-gray-100 dark:bg-gray-700 rounded-md flex flex-col sm:flex-row justify-between items-start gap-2"
                    >
                      <div className="flex-1">
                        {isUrl(resource.text) ? (
                          <a
                            href={resource.text}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline break-all"
                          >
                            {resource.text}
                          </a>
                        ) : (
                          <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">{resource.text}</p>
                        )}
                        <p className="text-sm text-gray-500 mt-1">
                          Added by <strong>{resource.addedBy}</strong> on {new Date(resource.timestamp).toLocaleString()}
                        </p>
                      </div>
                      {selectedProject.creator === auth.currentUser.uid && (
                        <button
                          onClick={() => handleDeleteResource(index)}
                          className="px-2 py-1 bg-red-600 text-white rounded-md hover:scale-105"
                        >
                          Delete
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
                {selectedProject.creator === auth.currentUser.uid && (
                  <div className="mt-4">
                    <textarea
                      placeholder="Add a note, link, or description..."
                      className="w-full p-2 border rounded-md dark:bg-gray-700 mb-2"
                      value={newResourceText}
                      onChange={(e) => setNewResourceText(e.target.value)}
                      rows="3"
                    />
                    <button
                      onClick={handleAddResource}
                      className="w-full md:w-auto px-4 py-2 bg-primary text-white rounded-md hover:scale-105"
                    >
                      Add Resource
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;