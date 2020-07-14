import React, {Component} from 'react'

export default class Peers extends Component {
    render() {
        return(
            <div>
                <li>
                    <i className="fa fa-user fa-fw "/>&nbsp;&nbsp;
                    {/* id = {this.props.id}
                    <br/> */}
                    {this.props.body}
                    <br/>
                    <hr/>
                </li>
            </div>
        )
    }
}