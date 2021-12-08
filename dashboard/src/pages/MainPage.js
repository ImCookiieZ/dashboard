import React from "react";
import Navbar from "../components/Navbar/Navbar";
import Dashboard from "../components/Dashboard/Dashboard";

class MainPage extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      id: ""
    }
  }

  update = (id) => {
    this.setState({
      id: id
    })
  }

  render() {
    return (
        <>
          <div>
            <Dashboard/>
            <Navbar update={this.update}/>
          </div>
        </>
    )
  }
}

export default MainPage