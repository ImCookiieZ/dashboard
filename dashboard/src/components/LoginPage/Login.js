import React, { useState } from "react";
import Axios from "axios";
import "./Login.css"
import { useNavigate } from "react-router-dom";
import useAuth from "../../Auth"

function Login() {
    const [usernameLog, setUsernameLog] = useState("");
    const [passwordLog, setPasswordLog] = useState("");
    const [message, setMessage] = useState("");
    const navigate = useNavigate()
    const { login } = useAuth()

    const loginUser = () => {
        if (usernameLog !== "" && passwordLog !== "") {
            Axios.get(`http://localhost:8080/login?name=${encodeURIComponent(usernameLog)}&password=${encodeURIComponent(passwordLog)}`, null,
            ).then((response) => {
                if (response.data.message) {
                    setMessage(response.data.message)
                    console.log(response)
                } else {
                    login(response.data).then(() => {
                        navigate("/")
                    })
                }
            })
        } else {
            setMessage("Please enter your Username and your Password")
        }
    }

    return (
        <div className="login">
            <h1>Login</h1>
            <h2 className="message">{message}</h2>
            <label>Username</label>
            <div>
                <input type="text"
                    onChange={(e) => setUsernameLog(e.target.value)} />
            </div>
            <label>Password</label>
            <div>
                <input type="password"
                    onChange={(e) => setPasswordLog(e.target.value)} />
            </div>
            <input type="submit" value="Login" onClick={loginUser} />
        </div>
    )
}

export default Login