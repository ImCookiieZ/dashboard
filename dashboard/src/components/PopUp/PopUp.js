import * as AiIcons from "react-icons/ai";
import "./PopUp.css"
import React from "react";

function PopUp(props) {

  return (props.trigger) ? (
      <div className="popup">
        <div className="popup-inner">
          <button className="close-btn" onClick={() => props.setTrigger(false)}>
            <AiIcons.AiOutlineClose/>
          </button>
          {props.children}
        </div>
      </div>
  ) : "";
}

export default PopUp;