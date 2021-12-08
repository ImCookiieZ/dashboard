import React, { useState } from "react";
import Axios from "axios";
import "./Login.css"

function SignUp() {

    const [usernameReg, setUsernameReg] = useState("");
    const [passwordReg, setPasswordReg] = useState("");
    const [passwordRepeatReg, setPasswordRepeatReg] = useState("");
    const [message, setMessage] = useState("");

    const signUp = () => {
        if (usernameReg === "" || passwordReg === "" || passwordRepeatReg === "") {
            setMessage("Please enter an Username and a Password")
            return
        }
        if (passwordReg === passwordRepeatReg) {
            Axios.post('http://localhost:8080/user', {
                'name': usernameReg,
                'password': passwordReg
            }).then((response) => {
              if (response.data.message)
                setMessage("Error: " + response)
              else
                window.location.href = "http://localhost:8080/authenticate?access_token=" + response.data.access_token
            })
        }
        // window.location = "http://localhost/authenticate"
        else {
            setMessage("Password differs")
        }
    }

    return (
        <div className="sign-up">
            <h1>Sign Up</h1>
            <div>
                <input type="text" placeholder="Username..."
                    onChange={(e) => setUsernameReg(e.target.value)} />
            </div>
            <div>
                <input type="password" placeholder="Password..."
                    onChange={(e) => setPasswordReg(e.target.value)} />
            </div>
            <div>
                <input type="password" placeholder="Repeat Password..."
                    onChange={(e) => setPasswordRepeatReg(e.target.value)} />
            </div>
            <h2 className="message">{message}</h2>
            <input type="submit" value="Sign Up" onClick={signUp} />
        </div>
    )
}

export default SignUp