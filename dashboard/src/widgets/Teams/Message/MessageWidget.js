import React from "react";
import Axios from "axios";
import {ClipLoader} from "react-spinners";
import "../../Widgets.css"

class MessageWidget extends React.Component {
  constructor(props) {
    super(props);
    this.user = props.user
    this.sort = props.sort
    this.time = parseInt(props.timer)
    this.state = {
      timer: 0,
      data: ""
    }
  }

  componentDidMount() {
    Axios.post(`http://localhost:8080/teams/widgets/messages`, {
          'sorting_type': encodeURIComponent(this.sort),
          'timer': this.time
        }, {
          headers: {
            "Authorization": this.user
          }
        }
    ).then((response) => {
      this.id = response.data.config_id
      this.updateData()
    })
    this.interval = setInterval(() => this.tick(), 1000)
  }

  updateData() {
      Axios.get(`http://localhost:8080/teams/widgets/messages/` + this.id, {
        headers: {
          "Authorization": this.user
        }
      }).then((res) => {
        this.setState({
          timer: 0,
          data: res.data.messages
        })
      })
  }

  tick() {
    if (this.state.timer < this.time) {
      this.setState({
        timer: this.state.timer + 1,
        data: this.state.data
      })
    } else {
      this.setState({
        timer: -42,
        data: ""
      })
      this.updateData()
    }
  }

  componentWillUnmount() {
    clearInterval(this.interval)
  }

  render () {
    if (this.state.data === "")
      return <div className="loading">
        <ClipLoader color={"#060b26"} loading={true} size={150}/>
      </div>
    else
      return ( this.state.data.length > 0 ?
              <div className="container">
                <ul>
                  {this.state.data.map((item, index) => {
                    if (item.type === "text")
                      return (
                        <li key={index}>
                          <h4>{item.name}</h4>
                          <p>{item.time}</p>
                          <span>{item.text}</span>
                        </li>)
                    else
                      return (
                          <li key={index}>
                            <h4>{item.name}</h4>
                            <p>{item.time}</p>
                            <div dangerouslySetInnerHTML={{__html: item.text}} />
                          </li>)
                  })}
                </ul>
              </div>
              : <div>
                <span>You have no messages...</span>
              </div>
    )
  }
}

/*name: "Niklas Scheffler"
text: "<div><div>\n<div><img alt=\"Feel Better Cheer Up GIF (GIF-Bild)\" height=\"250\" src=\"https://media1.giphy.com/media/SHyuhBtRr8Zeo/giphy.gif?cid=de9bf95e5x5u1wlrn4hh824idgfnhw2ah234mmy0lns19uf4&amp;rid=giphy.gif&amp;ct=g\" width=\"342\" style=\"max-height:250px; width:342px; height:250px\"></div>\n\n\n</div>\n</div>"
time: "2021-09-08T09:27:09.516Z"
type: "html"
[[Prototype]]: Object
4: {type: 'html', text: '<div><div>\n<div><img alt="get well hug GIF (GIF Im…width:353px; height:237px"></div>\n\n\n</div>\n</div>', name: 'Julia Béchameil', time: '2021-09-08T09:25:45.03Z'}
5:
name: "Julia Béchameil"
text: "hopefully really soon!"
time: "2021-09-08T09:24:27.437Z"
type: "text"*/

export default MessageWidget