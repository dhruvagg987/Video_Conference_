import React, { useRef,Component } from "react";

import './App.css'

import io from "socket.io-client";

import Video from './Components/Video'

import Videos from './Components/Videos'

import Draggable from './Components/draggable.js'

import Chat from './Components/chat'

import Alert from 'react-bootstrap/Alert'

import Button from 'react-bootstrap/Button'

import Form from 'react-bootstrap/Form'

import Dropdown from 'react-bootstrap/Dropdown'

import SplitButton from 'react-bootstrap/SplitButton'

// import { ButtonDropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';

import { hashHistory } from 'react-router';

import 'bootstrap/dist/css/bootstrap.min.css';

// import { faHome } from "@fortawesome/free-solid-svg-icons";
// import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { Container, Row, Col } from 'react-bootstrap';
import DropdownMenu from "react-bootstrap/esm/DropdownMenu";

class App extends Component {
  constructor(props) {
    super(props);
    this.chatref = React.createRef();
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

        messages: [],
        sendChannels: [],
        users : {},
        disconnected: false,
    }
    // this.localVideoref = React.createRef();
    // this.remoteVideoref = React.createRef();

    this.socket = null;
    // this.candidates = [];

  }

//   handleChange(e) {
//     this.setState({ username: e.target.value });
//  }

//  keyPress(e){
//     if(e.keyCode == 13){
//        console.log('username', e.target.value);
//        // put the login here
//     }
//  }

  shareScreen = () => {
    navigator.mediaDevices.getDisplayMedia({ audio:true, video:true, cursor: true }).then(stream => {
        
        window.localStream = stream
        this.setState({
          localStream: stream
        })
        let videoTrack = stream.getVideoTracks()[0];
        console.log("closing pc")
        console.log(this.state.peerConnections)
        for (const [socketID, pc] of Object.entries(this.state.peerConnections)){
          console.log("screen to peer :")
          console.log(pc)
          console.log(pc.getSenders())
          var sender = pc.getSenders().find(function(s) {
            return s.track.kind == videoTrack.kind;
          });
          console.log('found sender:', sender);
          sender.replaceTrack(videoTrack);
          // pc.addStream(this.state.localStream)
          // const pc = this.state.peerConnections[this.socket.id]
        }
        
        
        
        // pc.close()
        
      //   stream.getTracks().forEach((track) => {
      //     pc.addTrack(track, this.state.localStream)
      //   })

      //   screenTrack.onended = function() {
      //     this.state.localStream.getTracks().forEach((track) => {
      //       pc.addTrack(track, this.state.localStream)
      //     })
      // }

        

        // this.whoisOnline()

        // this.sendToPeer('screenshare',stream,{local: this.socket.id})
        // const screenTrack = stream.getTracks()[0];
        // senders.current.find(sender => sender.track.kind === 'video').replaceTrack(screenTrack);
        // console.log(screenTrack)
        // console.log("sending to server")
        

        
        videoTrack.onended = () => {
            console.log("ending screen share")
            navigator.mediaDevices.getUserMedia({audio:true, video:true , options:{mirror:true,}})
              .then( stream => {

                window.localStream = stream
                this.setState({
                localStream: stream
                })

                let videoTrack = stream.getVideoTracks()[0];
                
                for (const [socketID, pc] of Object.entries(this.state.peerConnections)){
                  console.log("screen end for peer :")
                  console.log(pc.getSenders())
                  var sender = pc.getSenders().find(function(s) {
                    return s.track.kind == videoTrack.kind;
                  });
                  console.log('found sender:', sender);
                  sender.replaceTrack(videoTrack);
                }
                
              })
        }
    })
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
    var username = (this.state.username)
    this.sendToPeer('onlinePeers',username,{local: this.socket.id})
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
      
      const status = data.peerCount > 1 ? `Total Connected Peers to room ${window.location.pathname.slice(5)}: ${data.peerCount}` : 'Waiting for other peers to connect'

      this.setState({
        status: status,
        room : window.location.pathname.slice(5),
        messages: data.messages        // new of chat
      })
    })

    this.socket.on('joined-peers', data => {
      this.setState({
        status: data.peerCount > 1 ? `Total Connected Peers to room ${window.location.pathname.slice(5)}: ${data.peerCount}` : 'Waiting for other peers to connect',
        users : data.Users
      })
      console.log("this state users  : : hey look here ..................")
      console.log(this.state.users)
      console.log(data.Users)
    })

    this.socket.on('peer-disconnected', data => {
      console.log('peer-disconnected', data)

      //remove from remoteStreams by filtering only other peer's streams
      const remoteStreams = this.state.remoteStreams.filter(stream => stream.id !== data.socketID)

      this.setState(prevState => {
        // check if disconnected peer is the selected video and if there still connected peers, then select the first
        const selectedVideo = prevState.selectedVideo.id === data.socketID && remoteStreams.length ? { selectedVideo: remoteStreams[0]} : null

        return{
          remoteStreams,
          ...selectedVideo,
          status: data.peerCount > 1 ? `Total Connected Peers to room ${window.location.pathname.slice(5)}: ${data.peerCount}` : 'Waiting for other peers to connect'
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
          {    //brackets are new
          //.....DO FOR PEER CONNECTION THAT CREATES OFFER.

          // Send Channel
          const handleSendChannelStatusChange = (event) => {
            console.log('send channel status: '+ this.state.sendChannels[0].readyState)
          }

          const sendChannel = pc.createDataChannel('sendChannel')
          sendChannel.onopen = handleSendChannelStatusChange
          sendChannel.onclose = handleSendChannelStatusChange

          this.setState(prevState => {
            return{
              sendChannels: [...prevState.sendChannels, sendChannel]
            }
          })

          // Recieve Channels 
          const handleRecieveMessage = (event) => {
            const message = JSON.parse(event.data)
            console.log(message)
            this.setState(prevState => {
              return {
                messages: [...prevState.messages, message]
              }
            })
          }

          const handleRecieveChannelStatusChange = (event) => {
            if(this.recievChannel){
              console.log("recieved channel's status has changed to "+ this.recievChannel.readyState)
            }
          }
          // ... (Note: not creating new data channel)
          const recieveChannelCallback = (event) => {
            const recievChannel = event.channel
            recievChannel.onmessage = handleRecieveMessage
            recievChannel.onopen = handleRecieveChannelStatusChange
            recievChannel.onclose = handleRecieveChannelStatusChange
          }

          pc.ondatachannel = recieveChannelCallback
          
          //.............

            pc.createOffer(this.state.sdpConstraints)
              .then(sdp => {
                pc.setLocalDescription(sdp)

                this.sendToPeer('offer', sdp, {
                  local: this.socket.id,
                  remote: socketID
                })
            })
        }  //...... new one
      })
    })

    this.socket.on('offer', data=> {
      this.createPeerConnection(data.socketID, pc => {

        // if (this.state.localStream)
        // this.state.localStream.getTracks().forEach((track) => {
        //   pc.addTrack(track, this.state.localStream);
        // })
        pc.addStream(this.state.localStream)

        // DO FOR PEER CONNECTION THAT CREATES AN ANSWER
        // Send Channel
        const handleSendChannelStatusChange = (event) => {
          console.log('send channel status: '+ this.state.sendChannels[0].readyState)
        }

        const sendChannel = pc.createDataChannel('sendChannel')
        sendChannel.onopen = handleSendChannelStatusChange
        sendChannel.onclose = handleSendChannelStatusChange

        this.setState(prevState => {
          return{
            sendChannels: [...prevState.sendChannels, sendChannel]
          }
        })

        // Recieve Channels 
        const handleRecieveMessage = (event) => {
          const message = JSON.parse(event.data)
          console.log(message)
          this.setState(prevState => {
            return {
              messages: [...prevState.messages, message]
            }
          })
        }

        const handleRecieveChannelStatusChange = (event) => {
          if(this.recievChannel){
            console.log("recieved channel's status has changed to "+ this.recievChannel.readyState)
          }
        }
        // ... (Note: not creating new data channel)
        const recieveChannelCallback = (event) => {
          const recievChannel = event.channel
          recievChannel.onmessage = handleRecieveMessage
          recievChannel.onopen = handleRecieveChannelStatusChange
          recievChannel.onclose = handleRecieveChannelStatusChange
        }

        pc.ondatachannel = recieveChannelCallback

        // ......................

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

    this.socket.on('screenshare', (data) => {
        console.log("shared screeen")
        console.log(data.socketID)
        console.log(data.screenStream)

        // this.setState({
        //   remoteStream: data.screenStream,
        // })
        const screenTrack = data.screenStream.getTracks()[0];
        // senders.current.find(sender => sender.track.kind === 'video').replaceTrack(screenTrack);

        const pc = this.state.peerConnections[data.socketID]
        pc.restartIce()

        
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
  // document.getElementById("chat_box").style.display = "none"
  // this.chatref.current.

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
  //   ${('.dropdown-menu')}.click(function(e) {
  //     e.stopPropagation();
  // });

//   $(document).mousemove(function(event){
//     if (document.activeElement != document.body) document.activeElement.blur();
//  });

    function handleClick(){
      this.chatref.current.style.display = "none";
    }

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
        <Video id="mainvid"
          videoStyles={{
            zIndex: 1,
            position:"fixed",
            top:"1px",
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
        <div>
        <div id="stats">
          { statusText }
          </div>
          <div id="stats1">
          
          {/* <span>
          <label>Name</label><span> </span>
          <input value={this.state.username} onKeyDown={ (e) => {if(e.keyCode == 13) {console.log('username', e.target.value); this.setState({ username: e.target.value });} } } onChange={ (e) => {this.setState({ username: e.target.value });} } />
          </span> */}
          
  {/* <Form.Control type="text" placeholder="Normal text" />
  <br />
  <Form.Control size="sm" type="text" placeholder="Small text" />
  <br></br> */}
  
    <div style={{width: "3rem", margin:0}}>
   <Dropdown>
  <Dropdown.Toggle variant="dark" id="dropdown-basic" title="options">
        <span><i className="fa fa-bars"></i></span>
  </Dropdown.Toggle>

  <Dropdown.Menu onClick={e => e.stopPropagation()}>
    <Dropdown.Item onClick={e => e.stopPropagation()}>
      <div>
        <Form onClick={e => e.stopPropagation()}>
          <Form.Group as={Row} controlId="formPlaintextPassword">
            <Form.Label column sm="4">
              Username
            </Form.Label>
            <Col sm="4">
              <Form.Control onSelect={e => e.stopPropagation()} onKeyDown={ (e) => {if(e.keyCode == 13) {console.log('username', e.target.value); this.setState({ username: e.target.value });} } } size="sm" type="text" placeholder={this.state.username} />
            </Col>
          </Form.Group>

          <Form.Group as={Row} controlId="formPlaintextPassword">
            <Form.Label column sm="4">
              Room_ID
            </Form.Label>
            <Col sm="4">
              <Form.Control onSelect={e => e.stopPropagation()}  onKeyDown={ (e) => {if(e.keyCode == 13) { console.log('room', e.target.value); window.location.href= (window.location.origin+"/room"+e.target.value); console.log(this.state.room); } } } size="sm" type="text" placeholder={this.state.room} />
            </Col>
          </Form.Group>
      </Form></div>
    </Dropdown.Item>
  
  <Dropdown.Item>
  <Button variant="primary" size="sm" onClick={this.shareScreen}>share screen</Button><span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
          <Button variant="outline-danger" size="sm" onClick={(e) => {this.setState({disconnected: true})}}> Leave </Button>
        
  </Dropdown.Item>
  </Dropdown.Menu>
</Dropdown></div>

{/* <div>{this.state.room}</div> */}
          {/* <Button variant="primary" size="sm" onClick={this.shareScreen}>share screen</Button>
          <Button variant="outline-danger" size="sm" onClick={(e) => {this.setState({disconnected: true})}}> Leave </Button> */}
        </div>
        </div>
        

          <div>
            <Videos
              switchVideo={this.switchVideo}
              remoteStreams={this.state.remoteStreams}
            ></Videos>
          </div>
          <br />
          

          <div id="stats2">
          <Button variant="success" onClick={()=>{
            if(this.chatref.current.style.display=="grid")
              this.chatref.current.style.display = "none"
            else
              this.chatref.current.style.display = "grid"
            }}
            style={{
              borderRadius: "90px",
            }}><i className="fa fa-comments fa-fw "></i></Button>
          {/* <Dropdown id={`dropdown-button-drop-up`}>
  <Dropdown.Toggle variant="dark" id={`dropdown-button-drop-up`} title="CHAT">
        <span><i className="fa fa-comments fa-fw "></i></span>
  </Dropdown.Toggle>

  <Dropdown.Menu onClick={e => e.stopPropagation()} style={{top: "-45rem", background: "none"}}>
    <Dropdown.Item onClick={e => e.stopPropagation()}>
      <div>
      <Chat onClick={e => e.stopPropagation()}
              user={{
                uid: this.socket && this.socket.id || '',
                sname: this.state.users[this.socket.id] 
              }}
              messages={this.state.messages}
              sendMessage={(message)=>{
                this.setState(prevState => {
                  return {messages: [...prevState.messages, message]}
                })
                this.state.sendChannels.map(sendChannel => {
                  sendChannel.readyState === 'open' && sendChannel.send(JSON.stringify(message))
                })
                this.sendToPeer('new-message',JSON.stringify(message), {local: this.socket.id})
              }}
          />

      </div>
    </Dropdown.Item>
  </Dropdown.Menu>
</Dropdown> */}
    
  </div>

      <div ref={this.chatref} style={{display: "grid"}}>
          <Chat 
              user={{
                uid: this.socket && this.socket.id || ''
              }}
              messages={this.state.messages}
              sendMessage={(message)=>{
                this.setState(prevState => {
                  return {messages: [...prevState.messages, message]}
                })
                this.state.sendChannels.map(sendChannel => {
                  sendChannel.readyState === 'open' && sendChannel.send(JSON.stringify(message))
                })
                this.sendToPeer('new-message',JSON.stringify(message), {local: this.socket.id})
              }}
          />
         </div>

      </div>
    )
  }
}

export default App;