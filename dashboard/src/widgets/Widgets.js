import * as React from "react";
import {widgetID} from "../components/Navbar/SidebarData";
import ActionsWidget from "./GitHub/Actions/ActionsWidget";
import FeedWidget from "./Reddit/Feed/FeedWidget";
import SubredditWidget from "./Reddit/Subreddit/SubredditWidget";
import MessageWidget from "./Teams/Message/MessageWidget";
import OnlineWidget from "./Twitch/Online/OnlineWidget";
import ServerWidget from "./Discord/Server/ServerWidget";
import * as AiIcons from "react-icons/ai";

export function isNumeric(num){
  return !isNaN(num)
}

const widgetContext = React.createContext(undefined);

function useWidget() {
  const [widgets, setWidgets] = React.useState([])

  function removeWidget(id, update) {
    const index = widgets.map(function (e) {return e.id}).indexOf(id)
    let clonedArray = Object.assign(widgets)
    clonedArray.splice(index, 1)
    update(index)
    setWidgets(clonedArray)
  }

  return {
    widgets,
    createWidget(id, user, update, configs) {
      if (widgets.length >= 8)
        return;
      const len = widgets.length
      let createdWidget;
      let clonedArray = Object.assign(widgets)
      const objectId = new Date()
      switch (id) {
        case widgetID.actions:
          createdWidget = {
            id: objectId,
            header: <div>
              <h3>GitHub Actions</h3>
              <button className="close-btn" onClick={() => removeWidget(objectId, update)}>
                <AiIcons.AiOutlineClose/>
              </button>
            </div>,
            body: <ActionsWidget user={user} owner={configs[0]} repo={configs[1]} timer={configs[2]}/>,
          }
          break;
        case widgetID.feed:
          createdWidget = {
            id: objectId,
            header: <div>
              <h3>Reddit Feed</h3>
              <button className="close-btn" onClick={() => removeWidget(objectId, update)}>
              <AiIcons.AiOutlineClose/>
              </button>
            </div>,
            body: <FeedWidget user={user} sort={configs[0]} timer={configs[1]}/>
          }
          break;
        case widgetID.subreddit:
          createdWidget = {
            id: objectId,
            header: <div>
              <h3>Subreddit Feed</h3>
              <button className="close-btn" onClick={() => removeWidget(objectId, update)}>
                <AiIcons.AiOutlineClose/>
              </button>
            </div>,
            body: <SubredditWidget user={user} name={configs[0]} sort={configs[1]} timer={configs[2]}/>
          }
          break;
        case widgetID.message:
          createdWidget = {
            id: objectId,
            header: <div>
              <h3>Teams Messages</h3>
              <button className="close-btn" onClick={() => removeWidget(objectId, update)}>
                <AiIcons.AiOutlineClose/>
              </button>
            </div>,
            body: <MessageWidget user={user} sort={configs[0]} timer={configs[1]}/>
          }
          break;
        case widgetID.online:
          createdWidget = {
            id: objectId,
            header: <div>
              <h3>Twitch Channels</h3>
              <button className="close-btn" onClick={() => removeWidget(objectId, update)}>
                <AiIcons.AiOutlineClose/>
              </button>
            </div>,
            body: <OnlineWidget user={user} sort={configs[0]} timer={configs[1]}/>
          }
          break;
        case widgetID.server:
          createdWidget = {
            id: objectId,
            header: <div>
              <h3>Discord Servers</h3>
              <button className="close-btn" onClick={() => removeWidget(objectId, update)}>
                <AiIcons.AiOutlineClose/>
              </button>
            </div>,
            body: <ServerWidget user={user} admin={configs[0]} sort={configs[1]} timer={configs[2]}/>
          }
          break;
        default:
          createdWidget = {}
      }
      createdWidget = {
        ...createdWidget,
        row: len > 3 ? 2 : 1,
        col: len > 3 ? len - 4 : len,
        colSpan: 1,
        rowSpan: 1,
      }
      clonedArray.push(createdWidget)
      return new Promise((res) => {
        setWidgets(clonedArray)
        update(id)
        res();
      });
    },
  };
}

export function WidgetProvider({ children }) {
  const widget = useWidget();

  return (
      <widgetContext.Provider value={widget}>
        {children}
      </widgetContext.Provider>
  );
}

export default function WidgetConsumer() {
  return React.useContext(widgetContext);
}
