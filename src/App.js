import React, { Component } from "react";

import io from "socket.io-client";

class App extends Component {
  constructor(props) {
    super(props);
    this.localVideoref = React.createRef();
    this.remoteVideoref = React.createRef();

    this.socket = null;
    this.candidates = [];
  }

  componentDidMount() {
    this.socket = io("/webrtcPeer", {
      path: "/webrtc",
      query: {},
    });

    this.socket.on("connection-success", (success) => {
      console.log(success);
    });

    this.socket.on("offerOrAnswer", (sdp) => {
      this.textref.value = JSON.stringify(sdp);

      //set sdp as remote desc (now automatically)
      this.pc.setRemoteDescription(new RTCSessionDescription(sdp));
    });

    this.socket.on("candidate", (candidate) => {
      // this.candidates = [...this.candidates,candidate]     ...... not adding to the array now instead do >>

      //(now automatically)
      this.pc.addIceCandidate(new RTCIceCandidate(candidate));
    });

    // const pc_config = null

    const pc_config = {
      iceServers: [
        // {
        //   urls: 'stun:[STUN-IP]:[PORT]',
        //   'credentials': '[YOUR CREDENTIAL]',
        //   'username': '[USERNAME]'
        // }
        {
          urls: "stun:stun.l.google.com:19302",
        },
      ],
    };

    this.pc = new RTCPeerConnection(pc_config);

    //triggerd when new candidate is returned
    this.pc.onicecandidate = (e) => {
      // if(e.candidate) console.log(JSON.stringify(e.candidate))
      this.sendToPeer("candidate", e.candidate);
    };

    //triggered when there is change in connection state
    this.pc.oniceconnectionstatechange = (e) => {
      console.log(e);
    };

    //triggered when a stream is added to pc
    this.pc.ontrack = (e) => {
      this.remoteVideoref.current.srcObject = e.streams[0];
    };

    const constraints = { video: true };
    const success = (stream) => {
      this.localVideoref.current.srcObject = stream;
      // this.pc.addTrack(stream)
      stream.getTracks().forEach((track) => {
        this.pc.addTrack(track, stream);
      });
    };

    const failure = (e) => {
      console.log("getUserMedia Error: ", e);
    };
    //navigator.getUserMedia(constraints,success,failure)
    navigator.mediaDevices
      .getUserMedia(constraints)
      .then(success)
      .catch(failure);
  }

  sendToPeer = (messageType, payload) => {
    this.socket.emit(messageType, {
      socketID: this.socket.id,
      payload,
    });
  };

  createOffer = () => {
    console.log("Offer");
    //initiates the creation of SDP
    this.pc.createOffer({ offerToReceiveVideo: 1 }).then(
      (sdp) => {
        // console.log(JSON.stringify(sdp))

        //set offer sdp as local description
        this.pc.setLocalDescription(sdp);

        this.sendToPeer("offerOrAnswer", sdp);
      },
      (e) => {}
    );
  };

  setRemoteDescription = () => {
    const desc = JSON.parse(this.textref.value);
    this.pc.setRemoteDescription(new RTCSessionDescription(desc));
  };

  createAnswer = () => {
    console.log("Answer");
    this.pc.createAnswer({ offerToReceiveVideo: 1 }).then(
      (sdp) => {
        // console.log(JSON.stringify(sdp))

        //set answer sdp as local description
        this.pc.setLocalDescription(sdp);
        this.sendToPeer("offerOrAnswer", sdp);
      },
      (e) => {}
    );
  };

  addCandidate = () => {
    // const candidate = JSON.parse(this.textref.value)
    // console.log('Adding Candidate:', candidate)
    // this.pc.addIceCandidate(new RTCIceCandidate(candidate))

    this.candidates.forEach((candidate) => {
      console.log(JSON.stringify(candidate));
      this.pc.addIceCandidate(new RTCIceCandidate(candidate));
    });
  };

  render() {
    return (
      <div>
        <video
          style={{
            zIndex: 2,
            position: "fixed",
            right: 0,
            bottom: 0,
            maxWidth: 200,
            maxHeight: 200,
            margin: 5,
            backgroundColor: "black",
          }}
          ref={this.localVideoref}
          autoPlay
        ></video>
        <video
          style={{
            zIndex: 1,
            position: "fixed",
            bottom: 0,
            minWidth: "100%",
            minHeight: "100%",
            backgroundColor: "black",
          }}
          ref={this.remoteVideoref}
          autoPlay
        ></video>
        <div style={{ zIndex: 1, position: "fixed" }}>
          <button onClick={this.createOffer}>Offer</button>
          <button onClick={this.createAnswer}>Answer</button>
          <br />
          <textarea
            ref={(ref) => {
              this.textref = ref;
            }}
          />
        </div>
      </div>
    );
  }
}

export default App;
