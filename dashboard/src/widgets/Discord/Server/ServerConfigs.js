import React, {useState} from "react";
import Select from 'react-select'
import {widgetID} from "../../../components/Navbar/SidebarData";
import useWidget, {isNumeric} from "../../Widgets";

function ServerConfigs(props) {
  const {createWidget} = useWidget();
  const options = [
    { value: 'name_small', label: 'Many members' },
    { value: 'name_high', label: 'Few members' },
    { value: 'none', label: 'None' },
  ]
  const [checked, setChecked] = React.useState(false);
  const [timer, setTimer] = useState("");
  const [sort, setSort] = useState("");
  const [message, setMessage] = useState("")

  return (<div>
    <h2>Server-Widget</h2>
    <h3 className="message">{message}</h3>
    <label>
      <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(!checked)}
      />
      Admin-only
    </label>
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
        createWidget(widgetID.server, props.user, props.update, [checked.toString(), sort, timer]);
        props.setOpen(false);
      }}/>
    </div>
  </div>)
}

export default ServerConfigs