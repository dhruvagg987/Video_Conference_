// https://www.freecodecamp.org/news/building-a-modern-chat-application-with-react-js-558896622194/

import React, { useState, useEffect, useRef } from 'react'
import DragDrop from './dragDrop'
import ReactDOM from 'react-dom';

const Chat = props => {
  const [message, setMessage] = useState('')
  const [user, setUser] = useState({ uid: 0, })
  const [imageZoom, setImageZoom] = useState(false)
  const [selectedImage, setSelectedImage] = useState('')

  const scrollToBottom = () => {
    const chat = document.getElementById("chatList");
    chat.scrollTop = chat.scrollHeight
  }
  var disp = 'grid'

  useEffect(() => {
    scrollToBottom()
    setUser({ uid: props.user.uid, })
  }, [props])

  const sendMessage = (msg) => {
    props.sendMessage(msg);
    scrollToBottom()
  }

  const handleSubmit = event => {
    if (message === '') return
    event.preventDefault();
    sendMessage({type:'text', message: { id: user.uid, sender: { uid: user.uid, sname: props.sname }, data: { text: message } }})
    setMessage('')
  };

  const handleChange = event => {
    setMessage(event.target.value)
  };

    const myfunc = event =>{
      alert(disp);
    };

  const renderMessage = (userType, data) => {
    console.log('===========', data)
    const message = data.message

    const msgDiv = data.type === 'text' && (
      <div className="msg">
        <p>{message.sender.sname}</p>
        {/* <p>{message.sender.sname}</p> */}
        <div className="message"> {message.data.text}</div>
      </div>
    ) || (
      <div className="msg">
        <p>{message.sender.sname}</p>
        <img
          onClick={() => {
            setImageZoom(true)
            setSelectedImage(message.data)
          }}
          className="message"
          style={{
            width: 200,
            // height: 100
            cursor: 'pointer',
          }}
          src={message.data} />
      </div>
    )

    return (<li className={userType} >{ msgDiv }</li>)

  }

  const showEnlargedImage = (data) => {
    return (<img
      src={data}
      style={{
        backgroundColor: 'black',
        position: 'relative',
        zIndex: 900,
        display: 'block',
        cursor: 'pointer',
        marginLeft: 'auto',
        marginRight: 'auto',
        padding: 20,
        borderRadius: 20,
      }}
      onClick={() => setImageZoom(false)}
    />)
  }


  return (
    <div>
      {imageZoom && showEnlargedImage(selectedImage)}

      <div id="chatbox" className="chatWindow" style={{
        zIndex: 10,
        position: 'absolute',
        right: "0rem",
        top: "25%",
        bottom: 14,
        display: disp,
        // width: 340,
        width: "20rem",
        // height: 650,
    }}>
        <ul className="chat" id="chatList">
          {props.messages.map(data => (
            <div key={data.id}>
              {user.uid === data.message.sender.uid ? renderMessage('self', data) : (renderMessage('other', data))}
            </div>
          ))}
        </ul>
        <DragDrop
          className="chatInputWrapper"
          sendFiles={(files) => {
            const reader = new FileReader()
            reader.onload = (e) => {
              //https://blog.mozilla.org/webrtc/large-data-channel-messages/
              //https://lgrahl.de/articles/demystifying-webrtc-dc-size-limit.html
              const maximumMessageSize = 262118 //65535 <=== 64KiB // 16384 <=== 16KiB to be safe
              if (e.target.result.length <= maximumMessageSize)
                sendMessage({ type: 'image', message: { id: user.uid, sender: { uid: user.uid, }, data: e.target.result } })
              else
                alert('Message exceeds Maximum Message Size!')
            }

            reader.readAsDataURL(files[0])
          }}
        >
          <div>
            <form onSubmit={handleSubmit} onClick={e => e.stopPropagation()}>
              <input
                onClick={e => e.stopPropagation()}
                className="textarea input"
                type="text"
                placeholder="Enter your message..."
                onChange={handleChange}
                value={message}
              />
              {/* <button variant="danger" style={{
                top:200,
                display: "float",
                }} id="tog"
                onclick ={ myfunc }>try</button> */}
            </form>
          </div>
        </DragDrop>
      </div>
      {/* <button variant="danger" style={{
        top:200,
        display: "float",
      }} id="tog" onclick={myfunc}>try</button> */}
      </div>
    )
}

export default Chat