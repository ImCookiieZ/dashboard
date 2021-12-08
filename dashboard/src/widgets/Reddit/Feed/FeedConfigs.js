import React, {useState} from "react";
import Select from 'react-select'
import {widgetID} from "../../../components/Navbar/SidebarData";
import useWidget, {isNumeric} from "../../Widgets";

function FeedConfigs(props) {
  const {createWidget} = useWidget();
  const options = [
    { value: 'hot', label: 'Hot' },
    { value: 'top', label: 'Top' },
    { value: 'new', label: 'New' },
    { value: 'rising', label: 'Rising' },
    { value: 'best', label: 'Best' }
  ]
  const [timer, setTimer] = useState("");
  const [sort, setSort] = useState("");
  const [message, setMessage] = useState("")

  return (<div>
    <h2>Feed-Widget</h2>
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
        createWidget(widgetID.feed, props.user, props.update, [sort, timer]);
        props.setOpen(false);
      }}/>
    </div>
  </div>)
}

export default FeedConfigs