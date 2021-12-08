import React from "react";
import Axios from "axios";
import { ClipLoader } from "react-spinners";
import "../../Widgets.css"

class ServerWidget extends React.Component {
    constructor(props) {
        super(props);
        this.user = props.user
        this.admin = props.admin
        this.sort = props.sort
        this.time = parseInt(props.timer)
        this.state = {
            timer: 0,
            data: ""
        }
    }

    componentDidMount() {
        Axios.post(`http://localhost:8080/discord/widgets/server`, {
                'admin_only': encodeURIComponent(this.admin),
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
        var d = new Date();
        var d2 = null;
        var ms = 1000
        do { d2 = new Date(); }
        while (d2 - d < ms);
        Axios.get(`http://localhost:8080/discord/widgets/server/` + this.id, {
            headers: {
                "Authorization": this.user
            }
        }).then((r) => {
            this.setState({
                timer: 0,
                data: r.data.server_names
            })
        }).catch((err) => {
            console.log(err)
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

    render() {
        if (this.state.data === "")
            return <div className="loading">
                <ClipLoader color={"#060b26"} loading={true} size={150}/>
            </div>
        else
            return (this.state.data.length > 0 ?
                    <div className="container">
                        <ul>
                            {this.state.data.map((item, index) => {
                                return (
                                    <li key={index}>
                                        <h4>{item.name}</h4>
                                    </li>)
                            })}
                        </ul>
                    </div>
                    : <div>
                        <span>No Servers found...</span>
                    </div>
            )
    }
}

export default ServerWidget