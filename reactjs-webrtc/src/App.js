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
      remoteStream: null,

      isRemoteOnline: false, 
      disconnected: false,
      isCalling: false,
      roomId: '',
      isLogin: false,
      userNotConnected: false,

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
    // 'http://10.10.0.96:4001/webrtcPeer',
    // console.log("CDM ::", window.location.pathname)

  }

  initSocket = ()=>{

    this.socket = io.connect(
      this.serviceIP,
      {
        path: '/io/webrtc',
        query: {
          room: this.state.roomId,
        }
      }
    )

    this.socket.on('connection-success', success => {
      console.log("connection-success ::",success)
    })

    // this.socket.on('offerOrAnswer', (sdp) => {

    //   // this.textref.value = JSON.stringify(sdp)
    //   // console.log("offerOrAnswer ::", sdp)
    //   if(sdp.type == "offer"){

    //     this.setState({isCalling: true})
    //   } else{
    //     this.setState({isCalling: false})

    //   } 


    //   // set sdp as remote description
    //   this.pc.setRemoteDescription(new RTCSessionDescription(sdp))
    // })

    this.socket.on('offer', (sdp) => {

      // this.textref.value = JSON.stringify(sdp)
      // console.log("offerOrAnswer ::", sdp)
      // if(sdp.type == "offer"){

      //   this.setState({isCalling: true})
      // } else{
      //   this.setState({isCalling: false})

      // } 

      this.setState({isCalling: true})

      // set sdp as remote description
      this.pc.setRemoteDescription(new RTCSessionDescription(sdp))
    })

    this.socket.on('answer', sdp => {
      // get remote's peerConnection

      this.setState({isCalling: false})
      this.pc.setRemoteDescription(new RTCSessionDescription(sdp))

    })

    this.socket.on('candidate', (candidate) => {
      // console.log('From Peer... ', JSON.stringify(candidate))
      // this.candidates = [...this.candidates, candidate]
      // console.log('In on candidate... ', JSON.stringify(candidate))

      this.pc.addIceCandidate(new RTCIceCandidate(candidate))
    })

    // create an instance of RTCPeerConnection
    this.pc = new RTCPeerConnection(this.state.pc_config)

    // triggered when a new candidate is returned
    this.pc.onicecandidate = (e) => {
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
    this.socket.on('peer-not-connected', data => {

      console.log("In peer-not-connected ::", data)

      this.setState({userNotConnected: true, isCalling: false})

    })

    this.socket.on('peer-disconnected', data => {
      console.log('In peer-disconnected', data);
      // console.log('In peer-disconnected ---', this.remoteVideoref.current);

      if(this.remoteVideoref.current && this.remoteVideoref.current.srcObject){

        this.stopTracks(this.remoteVideoref.current.srcObject);
        this.pc.close();
      alert(`Your friend has ended a call....`);
      this.setState({
        disconnected: true,
        isCalling: false,
        remoteStream: null,

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
      this.setState({
        remoteStream: e.streams[0]
      })

    }

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

    this.pc.createOffer(this.state.sdpConstraints)
      .then(sdp => {
        // console.log(JSON.stringify(sdp))
        // set offer sdp as local description
        this.pc.setLocalDescription(sdp)
        this.sendToPeer('offer', sdp);
        this.setState({isCalling: true, userNotConnected: false})


    })
  }

  createAnswer_dept = () => {
    console.log('Answer')
    this.pc.createAnswer(this.state.sdpConstraints)
      .then(sdp => {
        // console.log(JSON.stringify(sdp))

        // set answer sdp as local description
        this.pc.setLocalDescription(sdp)

        this.sendToPeer('offerOrAnswer', sdp)
        this.setState({isCalling: false, userNotConnected: false })

    })
  }

  createAnswer = () => {
    console.log('Answer')
    this.pc.createAnswer(this.state.sdpConstraints)
      .then(sdp => {
        // console.log(JSON.stringify(sdp))

        // set answer sdp as local description
        this.pc.setLocalDescription(sdp)

        this.sendToPeer('answer', sdp)
        this.setState({isCalling: false, userNotConnected: false })

    })
  }

  setRemoteDescription = () => {
    // retrieve and parse the SDP copied from the remote peer
    const desc = JSON.parse(this.textref.value)

    // set sdp as remote description
    this.pc.setRemoteDescription(new RTCSessionDescription(desc))
  }

  addCandidate = () => {
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

    this.socket.close();
    this.pc.close()

    this.setState({
      disconnected: true
    })

  }

  onLogin =()=>{

    this.setState({
      isLogin: true
    })

    this.initSocket()

  }

  render() {

    const { roomId, disconnected, isLogin } = this.state;

    if( disconnected ){
      
      return (<div>You have Disconnected...</div>)
    }

    if( !isLogin )
      return (
        <div>
         <div style={{ 
          position: "fixed",
          top: "40%",
          left: "40%",
          marginTop: "-50px",
          marginLeft: "-100px",
          borderRadius:" 5px",
          backgroundColor: "#f2f2f2",
          padding: "20px",
          width:"50%",
          height: "15%"
          }}>
            <input 
            value = {roomId}
            onChange={e=> this.setState({roomId: e.target.value}) }
            placeholder = "Enter room id"
            style={{
              width: "100%",
              padding: "12px 20px",
              margin: "8px 0",
              display: "inline-block",
              border: "1px solid #ccc",
              borderRadius:"4px",
              boxSizing: "border-box",
             }}
            type="text"/>
            { roomId &&
            <button 
              style={{
                backgroundColor: "#4CAF50",
                color: "white",
                padding: "12px 20px",
                float: "right",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
              onClick = {this.onLogin}
              type="submit">Continue</button>
          }

        </div>
        <div 
        style={{
          position:"absolute",
          bottom:"10%",
          left:"20%",
          // marginLeft: "-50%",
        }}
        > Developed By <a style={{fontWeight:"bold"}} href="https://github.com/sohel-khan" target="__blank"> SOHEL KHAN </a></div>
        </div>
      )

    // console.log("render sn ::", this.localVideoref.current);

    return (
      <div>
        <video
          style={{
            zIndex:2,
            position: 'absolute',
            right:0,
            top: "70%",
            width: 200,
            height: 200,
            margin: 10,
            backgroundColor: 'black',
          }}
          // muted="muted"
          ref={ this.localVideoref }
          autoPlay 
          // muted={false}
          >
        </video>
        <video
          style={{
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
        { this.state.remoteStream == null &&

        <button onClick= { !this.state.isCalling ? this.createOffer : null }>{ this.state.isCalling ? "Calling..." :"Call"}</button>
        }
          { this.state.isCalling && this.state.remoteStream != null &&
            <button onClick={this.createAnswer}>Answer</button>
          }

          { this.state.remoteStream != null &&
            <button style= {{color: 'red', margin:5}}  onClick={this.disconnect}>Disconnect</button>

          }
          { this.state.userNotConnected &&
          <div style={{color: "red", margin: 5}}>User is not available...</div>
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