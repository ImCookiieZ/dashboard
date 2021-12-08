import React, {useState} from "react";
import useWidget, {isNumeric} from "../../Widgets";
import {widgetID} from "../../../components/Navbar/SidebarData";

function ActionsConfigs(props) {
  const {createWidget} = useWidget();
  const [owner, setOwner] = useState("")
  const [repo, setRepo] = useState("")
  const [timer, setTimer] = useState("")
  const [message, setMessage] = useState("")

  return (<div>
    <h2>Actions-Widget</h2>
    <h3 className="message">{message}</h3>
    <label>Owner</label>
    <div>
      <input type="text" onChange={(e) => setOwner(e.target.value)}/>
    </div>
    <label>Repository Name</label>
    <div>
      <input type="text" onChange={(e) => setRepo(e.target.value)}/>
    </div>
    <label>Refresh timer (in seconds)</label>
    <div>
      <input type="text" onChange={(e) => setTimer(e.target.value)}/>
    </div>
    <div>
      <input type="submit" value="Create" onClick={() => {
        if (owner === "") {
          setMessage("Please enter the name of the owner")
          return
        }
        if (repo === "") {
          setMessage("Please enter the name of the repository")
          return
        }
        if (timer === "" || !isNumeric(timer)) {
          setMessage("Please enter a number as refresh time")
          return
        }
        createWidget(widgetID.actions, props.user, props.update, [owner, repo, timer]);
        props.setOpen(false);
      }}/>
    </div>
  </div>)
}

export default ActionsConfigs