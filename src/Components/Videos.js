import React, {Component} from 'react'
import Video from './Video'
import { Redirect } from 'react-router/cjs/react-router.min'

class Videos extends Component {
  constructor(props) {
    super(props)

    this.state = {
      rVideos: [],
      remoteStreams: []
    }
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.remoteStreams !== nextProps.remoteStreams) {
      
      let _rVideos = nextProps.remoteStreams.map((rVideo, index) => {

        const _videoTrack = rVideo.stream.getTracks().filter(track => track.kind === 'video')

        let video = _videoTrack && (
          <Video
            videoStream={rVideo.stream}
            frameStyle={{ width: 120, hieght: 120, float: 'left', padding: '0 3px 0 3px', }}
            videoStyles={{
              cursor: 'pointer',
              objectFit: 'cover',
              borderRadius: 3,
              width: '100%',
              height: '6rem',
              background: 'rgb(32,32,32)',
            }}
            autoplay
          />
        )|| <div></div>

        return (
          <div
            id={rVideo.name}
            onClick={() => this.props.switchVideo(rVideo)}
            style={{ display: 'inline-block', paddingRight:'0.8rem', }}
            key={index}
          >
            {video}
          </div>
        )
      })

      this.setState({
        remoteStreams: nextProps.remoteStreams,
        rVideos: _rVideos
      })
    }
  }

  render() {
    return (
      <div
        style={{
          zIndex: 3,
          position: 'fixed',
          // padding: '6px 3px',
          backgroundColor: 'rgba(0,0,0,0.3)',
          height: '8rem',
          top: 'auto',
          right: 220,
          left: 10,
          bottom: 10,
          overflowX: 'scroll',
          whiteSpace: 'nowrap'
        }}
      >
        { this.state.rVideos }
      </div>
    )
  }

}

export default Videos