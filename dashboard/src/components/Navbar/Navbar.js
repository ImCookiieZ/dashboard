import React, {useState} from "react";
import * as FaIcons from "react-icons/fa";
import * as AiIcons from "react-icons/ai";
import {BiLogOut} from "react-icons/all";
import {Link, useNavigate} from 'react-router-dom';
import {SidebarData, widgetID} from "./SidebarData";
import useAuth from "../../Auth"
import "./Navbar.css"
import PopUp from "../PopUp/PopUp";
import ActionsConfigs from "../../widgets/GitHub/Actions/ActionsConfigs";
import FeedConfigs from "../../widgets/Reddit/Feed/FeedConfigs";
import SubredditConfigs from "../../widgets/Reddit/Subreddit/SubredditConfigs";
import MessageConfigs from "../../widgets/Teams/Message/MessageConfigs";
import OnlineConfigs from "../../widgets/Twitch/Online/OnlineConfigs";
import ServerConfigs from "../../widgets/Discord/Server/ServerConfigs";


function Navbar(props) {
  const {user} = useAuth();
  const [sidebar, setSidebar] = useState(false)
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState({});
  const {logout} = useAuth()
  const navigate = useNavigate()

  const showSidebar = () => setSidebar(!sidebar)
  const handleLogout = () => {
    logout().then(() => {
      navigate("/login")
    })
  }

  const renderSwitch = (id) => {
    switch (id) {
      case widgetID.actions:
        return <ActionsConfigs user={user} update={props.update} setOpen={setOpen}/>
      case widgetID.feed:
        return <FeedConfigs user={user} update={props.update} setOpen={setOpen}/>
      case widgetID.subreddit:
        return <SubredditConfigs user={user} update={props.update} setOpen={setOpen}/>
      case widgetID.message:
        return <MessageConfigs user={user} update={props.update} setOpen={setOpen}/>
      case widgetID.online:
        return <OnlineConfigs user={user} update={props.update} setOpen={setOpen}/>
      case widgetID.server:
        return <ServerConfigs user={user} update={props.update} setOpen={setOpen}/>
      default:
        return ""
    }
  }

  return (
      <>
        <div className="navbar">
          <Link to="#" className='menu-bars'>
            <FaIcons.FaBars onClick={showSidebar}/>
          </Link>
        </div>
        <nav className={sidebar ? 'nav-menu active' : 'nav-menu'}>
          <ul className='nav-menu-items'>
            <li className="navbar-toggle" onClick={showSidebar}>
              <Link to="#" className="menu-bars">
                <AiIcons.AiOutlineClose/>
              </Link>
            </li>
            {SidebarData.map((item, index) => {
              if (item.cName === "nav-headline")
                return (
                    <li key={index} className={item.cName}>
                      <span>{item.title}</span>
                    </li>
                )
              else
                return (
                    <li key={index} className={item.cName}>
                      <button onClick={() => {
                        setOpen(!open);
                        setSelected(item);
                      }}>
                        <AiIcons.AiOutlinePlus/>
                        <span>{item.title}</span>
                      </button>
                    </li>
                )
            })}
          </ul>
          <div className="logout">
            <BiLogOut size={50} onClick={handleLogout}/>
          </div>
        </nav>
        <PopUp trigger={open} setTrigger={setOpen} id={selected.id} update={props.update}>
          {renderSwitch(selected.id)}
       </PopUp>
        </>
  )
}

export default Navbar;