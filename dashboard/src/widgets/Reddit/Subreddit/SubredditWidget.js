import React from "react";
import Axios from "axios";
import {ClipLoader} from "react-spinners";
import "../../Widgets.css"

class SubredditWidget extends React.Component {
  constructor(props) {
    super(props);
    this.user = props.user
    this.name = props.name
    this.sort = props.sort
    this.time = parseInt(props.timer)
    this.state = {
      timer: 0,
      data: ""
    }
  }

  componentDidMount() {
    Axios.post(`http://localhost:8080/reddit/widgets/subreddit`, {
          'subreddit': encodeURIComponent(this.name),
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
    Axios.get(`http://localhost:8080/reddit/widgets/subreddit/` + this.id, {
      headers: {
        "Authorization": this.user
      }
    }).then((res) => {
      this.setState({
        timer: 0,
        data: res.data.values
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
                return (<li key={index}>
                  <h4>{item.title}</h4>
                  <span>By {item.author}</span>
                  <span>{item.text}</span>
                </li>)
              })}
            </ul>
          </div>
          : <div>
            <span>No posts found...</span>
          </div>
      )
  }
}

export default SubredditWidget