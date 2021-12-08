import React from "react";
import "./LoginPage.css";
import Login from "../components/LoginPage/Login";
import SignUp from "../components/LoginPage/SignUp";

class LoginPage extends React.Component{

  constructor(props) {
    super(props);
    this.state = {
      selectedState: 'Login'
    }
  }


  switchState = () => {
    if (this.state.selectedState === 'Login') {
      this.setState({selectedState: 'SignUp'})
    } else {
      this.setState({selectedState: 'Login'})
    }
  }

  selectedState = () => {
    if (this.state.selectedState === 'Login') {
      return (
          <>
            <div>
              <Login/>
            </div>
            <button onClick={this.switchState}>No account yet? Sign Up now</button>
          </>
      )
    } else {
      return (
          <>
            <div>
              <SignUp/>
            </div>
            <button onClick={this.switchState}>Already have an account? Login now</button>
          </>
      )
    }
  }

  render() {
    return (
        <>
          <div className="login-page">
            {this.selectedState()}
          </div>
        </>
    )
  }
}

export default LoginPage