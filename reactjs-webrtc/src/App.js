import React, { Component } from 'react';

import io from 'socket.io-client'
import { SOCKET_IO_SERVER} from "./config"

class App extends Component {
  constructor(props) {
    super(props)

    // https://reactjs.org/docs/refs-and-the-dom.html
    this.localVideoref = React.createRef()
    this.remoteVideoref = React.createRef()

    this.socket = null
    this.candidates = [];
    // this.serviceIP = 'http://10.10.0.96:4001/webrtcPeer'
    this.serviceIP = SOCKET_IO_SERVER

    this.state = {
      isRemoteOnline: false, 
      disconnected: false,
      isCalling: false,
      
      pc_config: {
        "iceServers": [
          {
            urls : 'stun:stun.l.google.com:19302'
          }
        ]
      },

      sdpConstraints: {
        'mandatory': {
            'OfferToReceiveAudio': true,
            'OfferToReceiveVideo': true
        }
      },
    }
  }

  componentDidMount = () => {

    
    this.socket = io.connect(
      this.serviceIP,
      {
        path: '/io/webrtc',
        query: {
          room: "test",
        }
      }
    )

    this.socket.on('connection-success', success => {
      console.log("connection-success ::",success)
    })

    this.socket.on('offerOrAnswer', (sdp) => {

      // this.textref.value = JSON.stringify(sdp)

      this.setState({isCalling: true})

      // set sdp as remote description
      this.pc.setRemoteDescription(new RTCSessionDescription(sdp))
    })

    this.socket.on('candidate', (candidate) => {
      // console.log('From Peer... ', JSON.stringify(candidate))
      // this.candidates = [...this.candidates, candidate]
      console.log('In on candidate... ', JSON.stringify(candidate))

      this.pc.addIceCandidate(new RTCIceCandidate(candidate))
    })



    // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection
    // create an instance of RTCPeerConnection
    this.pc = new RTCPeerConnection(this.state.pc_config)

    // triggered when a new candidate is returned
    this.pc.onicecandidate = (e) => {
      // send the candidates to the remote peer
      // see addCandidate below to be triggered on the remote peer
      // console.log("In pc onicecandidate ::", e.candidate)
      if (e.candidate) {
        // console.log(JSON.stringify(e.candidate))
        this.sendToPeer('candidate', e.candidate)
      }
    }

    // triggered when there is a change in connection state
    this.pc.oniceconnectionstatechange = (e) => {
      console.log("In pc oniceconnectionstatechange ::")
    }

    // triggered when a stream is added to pc, see below - this.pc.addStream(stream)
    // this.pc.onaddstream = (e) => {
    //   this.remoteVideoref.current.srcObject = e.stream
    // }

    this.socket.on('peer-disconnected', data => {
      console.log('In peer-disconnected', data);
      console.log('In peer-disconnected ---', this.remoteVideoref.current.srcObject);

      if(this.remoteVideoref.current && this.remoteVideoref.current.srcObject){

        this.stopTracks(this.remoteVideoref.current.srcObject);
        this.pc.close();
      alert(`Remote user is disconnected...`);
      this.setState({
        disconnected: true,
        isCalling: false
      })

      }


    // this.remoteVideoref = React.createRef();

    // this.setState({
    //   isRemoteOnline: false
    // })

    })

    this.pc.ontrack = (e) => {
      // debugger
      this.remoteVideoref.current.srcObject = e.streams[0]

    }

    // called when getUserMedia() successfully returns - see below
    // getUserMedia() returns a MediaStream object (https://developer.mozilla.org/en-US/docs/Web/API/MediaStream)
    const success = (stream) => {
      console.log("Stream :::", stream)
      window.localStream = stream
      this.localVideoref.current.srcObject = stream
      this.pc.addStream(stream)
    }

    // called when getUserMedia() fails - see below
    const failure = (e) => {
      console.log('getUserMedia Error: ', e)
    }

    // https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
    // see the above link for more constraint options
    const constraints = {
      audio: true,
      // video: true,
      video: {
        width: 1280,
        height: 720,
        sampleRate: 30
      },
      // video: {
      //   width: { min: 1280 },
      // }
      options: {
        mirror: true,
      }
    }

    // https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
    navigator.mediaDevices.getUserMedia(constraints)
      .then(success)
      .catch(failure)
  }

  sendToPeer = (messageType, payload) => {
    this.socket.emit(messageType, {
      socketID: this.socket.id,
      payload
    })
  }

  /* ACTION METHODS FROM THE BUTTONS ON SCREEN */

  createOffer = () => {
    console.log('Offer')

    // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/createOffer
    // initiates the creation of SDP
    this.pc.createOffer(this.state.sdpConstraints)
      .then(sdp => {
        // console.log(JSON.stringify(sdp))
        // set offer sdp as local description
        this.pc.setLocalDescription(sdp)
        this.sendToPeer('offerOrAnswer', sdp);

    })
  }

  // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/createAnswer
  // creates an SDP answer to an offer received from remote peer
  createAnswer = () => {
    console.log('Answer')
    this.pc.createAnswer(this.state.sdpConstraints)
      .then(sdp => {
        // console.log(JSON.stringify(sdp))

        // set answer sdp as local description
        this.pc.setLocalDescription(sdp)

        this.sendToPeer('offerOrAnswer', sdp)
        this.setState({isCalling: false})

    })
  }

  setRemoteDescription = () => {
    // retrieve and parse the SDP copied from the remote peer
    const desc = JSON.parse(this.textref.value)

    // set sdp as remote description
    this.pc.setRemoteDescription(new RTCSessionDescription(desc))
  }

  addCandidate = () => {
    // retrieve and parse the Candidate copied from the remote peer
    // const candidate = JSON.parse(this.textref.value)
    // console.log('Adding candidate:', candidate)

    // add the candidate to the peer connection
    // this.pc.addIceCandidate(new RTCIceCandidate(candidate))

    this.candidates.forEach(candidate => {
      console.log(JSON.stringify(candidate))
      this.pc.addIceCandidate(new RTCIceCandidate(candidate))
    });
  }

  stopTracks = (stream) => {
    stream.getTracks().forEach(track => track.stop());
  }

  disconnect = ()=>{

    console.log("In dis ::", this.localVideoref.current.srcObject);

    this.stopTracks(this.localVideoref.current.srcObject);
    this.stopTracks(this.remoteVideoref.current.srcObject);
    // this.remoteVideoref.current = null

    // this.socket.close();
    this.pc.close()

    this.setState({
      disconnected: true
    })

  }

  render() {

    if(this.state.disconnected ){
      
      return (<div>You have Disconnected...</div>)
    }

    console.log("render sn ::", this.localVideoref.current);

    return (
      <div>
        <video
          style={{
            // width: 440,
            // height: 440,
            // margin: 5,
            // backgroundColor: 'black'
            zIndex:2,
            position: 'absolute',
            right:0,
            width: 200,
            height: 200,
            margin: 5,
            backgroundColor: 'black'
          }}
          ref={ this.localVideoref }
          autoPlay muted={false}>
        </video>
        <video
          style={{
            // width: 440,
            // height: 440,
            // margin: 5,
            // backgroundColor: 'black'
            zIndex: 1,
            position: 'fixed',
            bottom: 0,
            minWidth: '100%',
            minHeight: '100%',
            backgroundColor: 'black'
          }}
          ref={ this.remoteVideoref }
          autoPlay>
        </video>
        <br />
        <div style={{zIndex: 1, position: 'fixed'}} >
        {/* <button onClick={this.createOffer}>Call</button> */}

          { this.state.isCalling &&
            <button onClick={this.createAnswer}>Answer</button>

          }

          { this.remoteVideoref.current != null &&
            <button style= {{color: 'red', margin:5}}  onClick={this.disconnect}>Disconnect</button>

          }

        </div>
        {/* <br />
        <textarea style={{ width: 450, height:40 }} ref={ref => { this.textref = ref }} />
        </div> */}
        {/* <br />
        <button onClick={this.setRemoteDescription}>Set Remote Desc</button>
        <button onClick={this.addCandidate}>Add Candidate</button> */}
      </div>
    )
  }
}

export default App;