import React, { Component } from "react";

import './App.css'

import io from "socket.io-client";

import Video from './Components/Video'

import Videos from './Components/Videos'

import Draggable from './Components/draggable.js'

import Alert from 'react-bootstrap/Alert'

import Button from 'react-bootstrap/Button'

import Form from 'react-bootstrap/Form'

import { hashHistory } from 'react-router';

import 'bootstrap/dist/css/bootstrap.min.css';

import { Container, Row, Col } from 'react-bootstrap';

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

        username : "anonymous",

        room: window.location.pathname.slice(5,),

        pc_config: {
          "iceServers": [
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

        disconnected: false,
    }
    // this.localVideoref = React.createRef();
    // this.remoteVideoref = React.createRef();

    this.socket = null;
    // this.candidates = [];

  }

  handleChange(e) {
    this.setState({ username: e.target.value });
 }

 keyPress(e){
    if(e.keyCode == 13){
       console.log('username', e.target.value);
       // put the login here
    }
 }

  getLocalStream = () => {
    
    // called when getUserMedia() successfully returns
    const success= (stream) => {
      window.localStream = stream
      this.setState({
        localStream: stream
      })

      // console.log(this.state.localStream)

      this.whoisOnline()
    }

    // called when getUserMedia() fails 
    const failure=(e) => {
      console.log('getUserMedia Error: ',e)
    }

    const constraints = {
      audio: true,
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
    this.sendToPeer('onlinePeers',null,{local: this.socket.id})
  }

  sendToPeer = (messageType, payload, socketID) => {
    this.socket.emit(messageType, {
      socketID,
      payload
    })
  }

  createPeerConnection = (socketID, callback) => {
    
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

      // this.pc.oniceconnectionstatechange = (e) => {

      //   // if (pc.iceConnectionState === 'disconnected') {
      //   //   const remoteStreams = this.state.remoteStreams.filter(stream => stream.id !== socketID)

      //   //   this.setState({
      //   //     remoteStream: remoteStreams.length > 0 && remoteStreams[0].stream || null,
      //   //   })
      //   // }

      //   //console.log(e);
      // }

      //..............................NO IDEA................//
      pc.ontrack = (e) => {

        let _remoteStream = null
        let remoteStreams = this.state.remoteStreams
        let remoteVideo = {}

        // 1. check if stream already exists in remoteStreams
        const rVideos = this.state.remoteStreams.filter(stream => stream.id === socketID)
        
        // 2. if it does exist then add track
        if(rVideos.length){
          _remoteStream = rVideos[0].stream
          _remoteStream.addTrack(e.track, _remoteStream)
          remoteVideo = {
            ...rVideos[0],
            stream: _remoteStream,
          }
          remoteStreams = this.state.remoteStreams.map(_remoteVideo => {
            return _remoteVideo.id === remoteVideo.id && remoteVideo || _remoteVideo
          })
        } else {

          // 3. if not, then create new stream and add track
          _remoteStream = new MediaStream()
          _remoteStream.addTrack(e.track, _remoteStream)

          remoteVideo = {
            id: socketID,
            name: socketID,
            stream: _remoteStream,
          }
          remoteStreams = [...this.state.remoteStreams, remoteVideo]
        }

        // const remoteVideo = {
        //   id: socketID,
        //   name: socketID,
        //   stream: e.streams[0]
        // }

        this.setState(prevState => {

          // If we already have a stream in display let it stay the same, otherwise use the latest stream
          // const remoteStream = prevState.remoteStreams.length > 0 ? {} : { remoteStream: e.streams[0] }
          const remoteStream = prevState.remoteStreams.length > 0 ? {} : { remoteStream: _remoteStream }

          // get currently selected video
          let selectedVideo = prevState.remoteStreams.filter(stream => stream.id === prevState.selectedVideo.id)
          // if the video is still in the list, then do nothing, otherwise set to new video stream
          selectedVideo = selectedVideo.length ? {} : { selectedVideo: remoteVideo }

          return {
            // selectedVideo: remoteVideo,
            ...selectedVideo,
            // remoteStream: e.streams[0],
            ...remoteStream,
            remoteStreams,  //: [...prevState.remoteStreams, remoteVideo]
          }
        })
      }

      pc.close = () =>{
        // alert('gone')
      }

      if (this.state.localStream)
        this.state.localStream.getTracks().forEach((track) => {
          pc.addTrack(track, this.state.localStream)
        })
        // pc.addStream(this.state.localStream)

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
      path: "/io/webrtc",
      query: {
        room: window.location.pathname,
      }
    })

    this.socket.on("connection-success", data => {
      this.getLocalStream()

      console.log(data.success)
      
      const status = data.peerCount > 1 ? `Total Connected Peers to room ${window.location.pathname}: ${data.peerCount}` : 'Waiting for other peers to connect'

      this.setState({
        status: status,
        room : window.location.pathname.slice(4),
      })
    })

    this.socket.on('joined-peers', data => {
      this.setState({
        status: data.peerCount > 1 ? `Total Connected Peers to room ${window.location.pathname}: ${data.peerCount}` : 'Waiting for other peers to connect'
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

    this.socket.on('online-peer', socketID => {
      console.log('connected peers ...', socketID)

      //create and send offer to the peer (data.socketID)
      // 1. Create new pc
      this.createPeerConnection(socketID, pc => {
        // 2. Create Offer
          if(pc)
            pc.createOffer(this.state.sdpConstraints)
              .then(sdp => {
                pc.setLocalDescription(sdp)

                this.sendToPeer('offer', sdp, {
                  local: this.socket.id,
                  remote: socketID
                })
            })
      })
    })

    this.socket.on('offer', data=> {
      this.createPeerConnection(data.socketID, pc => {

        // if (this.state.localStream)
        // this.state.localStream.getTracks().forEach((track) => {
        //   pc.addTrack(track, this.state.localStream);
        // })
        pc.addStream(this.state.localStream)

        pc.setRemoteDescription(new RTCSessionDescription(data.sdp))
          .then(() => {
            // 2. Create Answer
            pc.createAnswer(this.state.sdpConstraints)
              .then(sdp => {
                pc.setLocalDescription(sdp)

                this.sendToPeer('answer', sdp, {
                  local: this.socket.id,
                  remote: data.socketID
                })
              })
          })
      })
    })

    this.socket.on('answer', data => {
      // get remote's peerConnection
      const pc = this.state.peerConnections[data.socketID]
      console.log(data.sdp)
      pc.setRemoteDescription(new RTCSessionDescription(data.sdp)).then(() => {})
    })

    this.socket.on('candidate', (data) => {
      //get remote's peerConnection
      const pc = this.state.peerConnections[data.socketID]

      if (pc)
        pc.addIceCandidate(new RTCIceCandidate(data.candidate))
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


  }

  switchVideo = (_video) => {
    console.log(_video)
    this.setState({
      selectedVideo: _video
    })
  }

  render() {

    console.log(this.state.localStream)
    console.log(this.state.username)
    if (this.state.disconnected) {
      this.socket.close()
      this.state.localStream.getTracks().forEach(track => track.stop())
      return(
          <Alert  variant="dark" >
           You have successfully Disconnected
      </Alert>
      )
    }

    const statusText = <div style={{ color: 'white', padding: 5 }}>{this.state.status}</div>

    return (
      <div style={{backgroundColor: "black",}}>
      <Draggable style={{
          zIndex: 101,
          position: 'absolute',
          right: 0,
          cursor: 'move'
        }}>
          <Video
            videoStyles={{
              zIndex: 2,
              // position: "absolute",
              right: 15,
              width: 200,
              // bottom: 5,
              // maxWidth: 200,
              // maxHeight: 200,
              // margin: 5,
              // backgroundColor: "black",
            }}
            frameStyle={{
              width: 200,
              margin: 5,
              borderRadius: 5,
              backgroundColor: 'black',
            }}
            showMuteControls = {true}
            // ref={this.localVideoref}
            videoStream={this.state.localStream}
            autoPlay muted
          ></Video>
        </Draggable>
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
          // videoStream={this.state.remoteStream}
          videoStream={this.state.selectedVideo && this.state.selectedVideo.stream}
          autoPlay>
        </Video>

        <br />
        <div id="stats">
          { statusText }
          <br></br>
          {/* <span>
          <label>Name</label><span> </span>
          <input value={this.state.username} onKeyDown={ (e) => {if(e.keyCode == 13) {console.log('username', e.target.value); this.setState({ username: e.target.value });} } } onChange={ (e) => {this.setState({ username: e.target.value });} } />
          </span> */}
          <br></br>
  {/* <Form.Control type="text" placeholder="Normal text" />
  <br />
  <Form.Control size="sm" type="text" placeholder="Small text" />
  <br></br> */}
  <Form>
      <Form.Group as={Row} controlId="formPlaintextPassword">
        <Form.Label column sm="4">
          Username
        </Form.Label>
        <Col sm="4">
          <Form.Control  onKeyDown={ (e) => {if(e.keyCode == 13) {console.log('username', e.target.value); this.setState({ username: e.target.value });} } } size="sm" type="text" placeholder={this.state.username} />
        </Col>
      </Form.Group>

      <Form.Group as={Row} controlId="formPlaintextPassword">
        <Form.Label column sm="4">
          Room_ID
        </Form.Label>
        <Col sm="4">
          <Form.Control  onKeyDown={ (e) => {if(e.keyCode == 13) { console.log('room', e.target.value); window.location.href= (window.location.origin+"/room"+e.target.value); console.log(this.state.room); } } } size="sm" type="text" placeholder={this.state.room} />
        </Col>
      </Form.Group>
  </Form>
{/* <div>{this.state.room}</div> */}
          <Button variant="outline-danger" size="sm" onClick={(e) => {this.setState({disconnected: true})}}> Leave </Button>
        </div>

          <div>
            <Videos
              switchVideo={this.switchVideo}
              remoteStreams={this.state.remoteStreams}
            ></Videos>
          </div>
          <br />

      </div>
    )
  }
}

export default App;