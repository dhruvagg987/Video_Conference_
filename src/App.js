import React, { Component } from "react";

import io from "socket.io-client";

import Video from './Components/Video'

import Videos from './Components/Videos'

class App extends Component {
  constructor(props) {
    super(props);

    this.state = {
      localStream: null,    // used to hold local stream object to avoid recreating the stream everytime a new offer comes
      remoteStream: null,   // used to hold remote stream object that is displayed in the main screen
      
      remoteStreams: [],    // holds all Video Streams (all remote streams)
      peerConnections: {},  // holds all Peer connections
      selectedVideo: null,

      status: 'Please wait...',

      pc_config = {
        "iceServers": [
          // {
          //   urls: 'stun:[STUN-IP]:[PORT]',
          //   'credentials': '[YOUR CREDENTIAL]',
          //   'username': '[USERNAME]'
          // }
          {
            urls: "stun:stun.l.google.com:19302",
          }
        ]
      },

      sdpConstraints: {
        'mandatory' : {
          'OfferToRecieveAudio': true,
          'OfferToRecieveVideo':true
        }
      },

    }
    // this.localVideoref = React.createRef();
    // this.remoteVideoref = React.createRef();

    this.socket = null;
    // this.candidates = [];
  }

  getLocalStream = () => {
    
    // called when getUserMedia() successfully returns
    const sucess= (stream) => {
      window.localStream = stream
      this.setState({
        localStream: stream
      })

      this.whoisOnline()
    }

    // called when getUserMedia() fails 
    const failure=(e) => {
      console.log('getUserMedia Error: ',e)
    }

    const constraints = {
      // audio: true,
      video: true,
      // video: {
      //   width: 1280,
      //   height: 720
      // },
      // video: {
      //   width: { min: 1280 },
      // }
      options: {
        mirror: true,
      }
    }

    navigator.mediaDevices.getUserMedia(constraints)
      .then(success)
      .catch(failure);

  }

  whoisOnline = () => {
    //let all peers know I am joining
    this.sendToPeer('onlinePeers',null,{local: this.socketID})
  }

  sendToPeer = (messageType, payload, socketID) => {
    this.socket.emit(messageType, {
      socketID,
      payload
    })
  }

  createPeerConnections = (socketID, callback) => {
    
    try{
      let pc = new RTCPeerConnection(this.state.pc_config)

      //add pc to peerConnections object
      const peerConnections= { ...this.state.peerConnections, [socketID]:pc }
      this.setState({
        peerConnections
      })

      pc.onicecandidate = (e) => {
        if(e.candidate){
          this.sendToPeer('candidate', e.candidate, {
            local: this.socket.id,
            remote: socketID
          })
        }
      }

      this.pc.oniceconnectionstatechange = (e) => {

        // if (pc.iceConnectionState === 'disconnected') {
        //   const remoteStreams = this.state.remoteStreams.filter(stream => stream.id !== socketID)

        //   this.setState({
        //     remoteStream: remoteStreams.length > 0 && remoteStreams[0].stream || null,
        //   })
        // }

        console.log(e);
      }

      //..............................NO IDEA................//
      pc.ontrack = (e) => {
        const remoteVideo = {
          id: socketID,
          name: socketID,
          stream: e.streams[0]
        }

        this.setState(prevState => {

          // If we already have a stream in display let it stay the same, otherwise use the latest stream
          const remoteStream = prevState.remoteStreams.length > 0 ? {} : { remoteStream: e.streams[0] }

          // get currently selected video
          let selectedVideo = prevState.remoteStreams.filter(stream => stream.id === prevState.selectedVideo.id)
          // if the video is still in the list, then do nothing, otherwise set to new video stream
          selectedVideo = selectedVideo.length ? {} : { selectedVideo: remoteVideo }

          return {
            // selectedVideo: remoteVideo,
            ...selectedVideo,
            // remoteStream: e.streams[0],
            ...remoteStream,
            remoteStreams: [...prevState.remoteStreams, remoteVideo]
          }
        })
      }

      pc.close = () =>{
        //alert('gone')
      }

      if (this.state.localStream)
        this.state.localStream.getTracks().forEach((track) => {
          this.pc.addTrack(track, this.state.localStream);
        })
        //pc.addTrack(this.state.localStream)

      //return pc
      callback(pc)
    
    }catch(e) {
      console.log("something went wrong! pc not created!!",e)
      //return
      callback(null)
    }
  
  }

  componentDidMount() {

    document.body.style.backgroundColor = "black"

    this.socket = io("/webrtcPeer", {
      path: "/webrtc",
      query: {
        room: window.location.pathname,
      }
    })

    this.socket.on("connection-success", data => {
      this.getLocalStream()

      console.log(data.sucess)
      //...............NO........//
      const satatus = data.peerCount > 1 ? `Total Connected Peers to room ${window.location.pathname}: ${data.peerCount}` : 'Waiting for other peers to connect'

      this.setState({
        status: status
      })
    })

    this.socket.on('joined-peers', data => {
      this.setState({
        satatus: data.peerCount > 1 ? `Total Connected Peers to room ${window.location.pathname}: ${data.peerCount}` : 'Waiting for other peers to connect'
      })
    })

    this.socket.on('peer-disconnected', data => {
      console.log('peer-disconnected', data)

      const remoteStreams = this.state.remoteStreams.filter(stream => stream.id !== data.socketID)

      this.setState(prevState => {
        // check if disconnected peer is the selected video and if there still connected peers, then select the first
        const selectedVideo = prevState.selectedVideo.id === data.socketID && remoteStreams.length ? { selectedVideo: remoteStreams[0]} : null

        return{
          remoteStreams,
          ...selectedVideo,
          status: data.peerCount > 1 ? `Total Connected Peers to room ${window.location.pathname}: ${data.peerCount}` : 'Waiting for other peers to connect'
        }
      })
    })



     // 226



      //                   START HERE








    // this.socket.on("offerOrAnswer", (sdp) => {
    //   this.textref.value = JSON.stringify(sdp);

    //   //set sdp as remote desc (now automatically)
    //   this.pc.setRemoteDescription(new RTCSessionDescription(sdp));
    // });

  //   this.socket.on("candidate", (candidate) => {
  //     // this.candidates = [...this.candidates,candidate]     ...... not adding to the array now instead do >>

  //     //(now automatically)
  //     this.pc.addIceCandidate(new RTCIceCandidate(candidate));
  //   });

  //   this.pc = new RTCPeerConnection(pc_config);

  //   //triggerd when new candidate is returned
  //   this.pc.onicecandidate = (e) => {
  //     // if(e.candidate) console.log(JSON.stringify(e.candidate))
  //     this.sendToPeer("candidate", e.candidate);
  //   };

  //   //triggered when there is change in connection state
  //   this.pc.oniceconnectionstatechange = (e) => {
  //     console.log(e);
  //   };

  //   //triggered when a stream is added to pc
  //   this.pc.ontrack = (e) => {
  //     // this.remoteVideoref.current.srcObject = e.streams[0];
  //     this.setState({
  //       remoteStream: e.streams[0]
  //     })
  //   };

  //   const constraints = { video: true, audio: true };
  //   const success = (stream) => {
  //     // this.localVideoref.current.srcObject = stream;  ....no longer needed
  //     //...now use
  //     this.setState({
  //       localStream: stream
  //     })
  //     // this.pc.addTrack(stream)
  //     stream.getTracks().forEach((track) => {
  //       this.pc.addTrack(track, stream);
  //     });

      
  //   };

  //   const failure = (e) => {
  //     console.log("getUserMedia Error: ", e);
  //   };
  //   //navigator.getUserMedia(constraints,success,failure)
  //   navigator.mediaDevices
  //     .getUserMedia(constraints)
  //     .then(success)
  //     .catch(failure);
  // }

  // sendToPeer = (messageType, payload) => {
  //   this.socket.emit(messageType, {
  //     socketID: this.socket.id,
  //     payload,
  //   });
  // };

  // createOffer = () => {
  //   console.log("Offer");
  //   //initiates the creation of SDP
  //   this.pc.createOffer({ offerToReceiveVideo: 1 }).then(
  //     (sdp) => {
  //       // console.log(JSON.stringify(sdp))

  //       //set offer sdp as local description
  //       this.pc.setLocalDescription(sdp);

  //       this.sendToPeer("offerOrAnswer", sdp);
  //     },
  //     (e) => {}
  //   );
  // };

  // setRemoteDescription = () => {
  //   const desc = JSON.parse(this.textref.value);
  //   this.pc.setRemoteDescription(new RTCSessionDescription(desc));
  // };

  // createAnswer = () => {
  //   console.log("Answer");
  //   this.pc.createAnswer({ offerToReceiveVideo: 1 }).then(
  //     (sdp) => {
  //       // console.log(JSON.stringify(sdp))

  //       //set answer sdp as local description
  //       this.pc.setLocalDescription(sdp);
  //       this.sendToPeer("offerOrAnswer", sdp);
  //     },
  //     (e) => {}
  //   );
  // };

  // addCandidate = () => {
  //   // const candidate = JSON.parse(this.textref.value)
  //   // console.log('Adding Candidate:', candidate)
  //   // this.pc.addIceCandidate(new RTCIceCandidate(candidate))

  //   this.candidates.forEach((candidate) => {
  //     console.log(JSON.stringify(candidate));
  //     this.pc.addIceCandidate(new RTCIceCandidate(candidate));
  //   });
  // };

  render() {

    console.log(this.state.localStream)

    return (
      <div style={{backgroundColor: "black",}}>
        <Video
          videoStyles={{
            zIndex: 2,
            position: "absolute",
            right: 0,
            bottom: 0,
            maxWidth: 200,
            maxHeight: 200,
            margin: 5,
            backgroundColor: "black",
          }}
          // ref={this.localVideoref}
          videoStream={this.state.localStream}
          autoPlay muted
        ></Video>
        <Video
          videoStyles={{
            zIndex: 1,
            position:"fixed",
            top:7,
            margin:1,
            bottom:1,
            bottom: 2,
            minWidth:"100%",
            maxHeight: "80%",
            backgroundColor: "black",
          }}
          // ref={this.remoteVideoref}
          videoStream={this.state.remoteStream}
          autoPlay
        ></Video>

          <div>
            <Videos
              switchVideo={() => { }}
              remoteStreams={this.state.remoteStreams}
            ></Videos>
          </div>
          <br />

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
