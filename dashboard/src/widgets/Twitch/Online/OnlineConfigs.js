import React, {useState} from "react";
import Select from 'react-select'
import {widgetID} from "../../../components/Navbar/SidebarData";
import useWidget from "../../Widgets";
import {isNumeric} from "../../Widgets";

function OnlineConfigs(props) {
  const {createWidget} = useWidget();
  const options = [
    { value: 'viewer_high', label: 'Many viewers' },
    { value: 'viewer_small', label: 'Few viewers' },
    { value: 'name', label: 'Name' },
  ]
  const [sort, setSort] = useState("");
  const [timer, setTimer] = useState("");
  const [message, setMessage] = useState("")

  return (<div>
    <h2>Online-Widget</h2>
    <h3 className="message">{message}</h3>
    <label>Sorted by</label>
    <Select
        options={options}
        value={options.find(obj => obj.value === sort)}
        onChange={(e) => setSort(e.value)}/>
    <label>Refresh timer (in seconds)</label>
    <div>
      <input type="text" onChange={(e) => setTimer(e.target.value)}/>
    </div>
    <div>
      <input type="submit" value="Create" onClick={() => {
        if (sort === "") {
          setMessage("Please select a sorting option")
          return
        }
        if (timer === "" || !isNumeric(timer)) {
          setMessage("Please enter a number as refresh time")
          return
        }
        createWidget(widgetID.online, props.user, props.update, [sort, timer]);
        props.setOpen(false);
      }}/>
    </div>
  </div>)
}

export default OnlineConfigs