/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

import React from 'react';
import {
  SafeAreaView,
  StyleSheet,
  ScrollView,
  View,
  Text,
  StatusBar,
  TouchableOpacity,
  Dimensions,
} from 'react-native';

import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  RTCView,
  MediaStream,
  MediaStreamTrack,
	getUserMedia,
	
} from "react-native-webrtc-usb-lib";

import io from 'socket.io-client'

const dimensions = Dimensions.get('window')

class App extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      localStream: null,
      remoteStream: null,
    }

    this.sdp
    this.socket = null
    this.candidates = []
  }

  componentDidMount = () => {

    this.socket = io.connect(
      'https://1270.0.1:3000/webrtcPeer',
      {
        path: '/io/webrtc',
        query: {
          room: "test"
        }
      }
    )

    this.socket.on('connection-success', success => {
      console.log("connection-success ::", success)
    })

    this.socket.on('offerOrAnswer', (sdp) => {

      this.sdp = JSON.stringify(sdp)

      // set sdp as remote description
      this.pc.setRemoteDescription(new RTCSessionDescription(sdp))
    })

    this.socket.on('candidate', (candidate) => {
      // console.log('From Peer... ', JSON.stringify(candidate))
      // this.candidates = [...this.candidates, candidate]
      this.pc.addIceCandidate(new RTCIceCandidate(candidate))
    })

    const pc_config = {
      "iceServers": [
        // {
        //   urls: 'stun:[STUN_IP]:[PORT]',
        //   'credentials': '[YOR CREDENTIALS]',
        //   'username': '[USERNAME]'
        // },
        {
          urls: 'stun:stun.l.google.com:19302'
        }
      ]
    }

    this.pc = new RTCPeerConnection(pc_config)

    this.pc.onicecandidate = (e) => {
      // send the candidates to the remote peer
      // see addCandidate below to be triggered on the remote peer
      if (e.candidate) {
        // console.log(JSON.stringify(e.candidate))
        this.sendToPeer('candidate', e.candidate)
      }
    }

    // triggered when there is a change in connection state
    this.pc.oniceconnectionstatechange = (e) => {
      console.log(e)
    }

    this.pc.onaddstream = (e) => {
      // debugger
      // this.remoteVideoref.current.srcObject = e.streams[0]
      console.log("In onaddstream ::", e.stream)
      this.setState({
        remoteStream: e.stream
      })
    }
    
    const success = (stream) => {
      console.log("In getUserMedia success ::", stream)
      this.setState({
        localStream: stream
      })
      this.pc.addStream(stream)
    }

    const failure = (e) => {
      console.log('getUserMedia Error: ', e)
    }

		let isFront = true;
		
		MediaStreamTrack
		.getSources()
		.then(async sourceInfos => {
			// console.log("devices list ::", sourceInfos);
			
			let videoSourceId, device;
			for (let i = 0; i < sourceInfos.length; i++) {
				const sourceInfo = sourceInfos[i];
				// if(sourceInfo.kind == "video" && sourceInfo.facing == "usb") {
				if(sourceInfo.kind == "video" || sourceInfo.facing == "usb") {

					videoSourceId = sourceInfo.id;
					// console.log("sourceInfo ::",sourceInfo)
					device = sourceInfo.facing
				}
			}
			console.log("videoSourceId  ::", videoSourceId, device);
			// this.setState({
			// 	device: device  ? device : null
			// })

      const constraints = {
        audio: true,
        video: {
          mandatory: {
            minWidth: 500, // Provide your own width, height and frame rate here
            minHeight: 300,
            minFrameRate: 30
          },
          facingMode: (isFront ? "user" : "environment"),
          optional: (videoSourceId ? [{ sourceId: videoSourceId }] : [])
        }
      }

      return getUserMedia(constraints)
        .then(success)
        .catch(failure);
    });
  }

    sendToPeer = (messageType, payload) => {
      // console.log('=================================')
      
      // console.log('sendToPeer ::', messageType, payload);
      // console.log('=================================')

      this.socket.emit(messageType, {
        socketID: this.socket.id,
        payload
      })
    }

    createOffer = () => {
      console.log('Offer')
  
      // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/createOffer
      // initiates the creation of SDP
      this.pc.createOffer({ offerToReceiveVideo: 1 })
        .then(sdp => {
          // console.log(JSON.stringify(sdp))
  
          // set offer sdp as local description
          this.pc.setLocalDescription(sdp)
  
          this.sendToPeer('offerOrAnswer', sdp)
      })
      .catch(err => console.log("In createOffer catch ::", err))

    }
    
    createAnswer = () => {
      console.log('Answer')
      this.pc.createAnswer({ offerToReceiveVideo: 1 })
        .then(sdp => {
          // console.log(JSON.stringify(sdp))
          
          // set answer sdp as local description
          this.pc.setLocalDescription(sdp)
  
          this.sendToPeer('offerOrAnswer', sdp)
      })
      .catch(err => console.log("In answer catch ::", err))
    }

    setRemoteDescription = () => {
      // retrieve and parse the SDP copied from the remote peer
      const desc = JSON.parse(this.sdp)
  
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


  render() {
    const {
      localStream,
      remoteStream,
    } = this.state

    // console.log("In render remoteStream :", remoteStream);
    console.log("In render localStream :", this.state.localStream);

    console.log("In render remoteStream :", this.state.remoteStream);


    const remoteVideo = remoteStream ?
      (
        <RTCView
              // key={1}
              // zOrder={0}
              objectFit='cover'
              style={{ ...styles.rtcView }}
              streamURL={remoteStream && remoteStream.toURL()}
              />
      ) :
      (
        <View style={{ padding: 15, }}>
          <Text style={{ fontSize:22, textAlign: 'center', color: 'white' }}>Waiting for Peer connection ...</Text>
        </View>
      )

    return (
      
      <SafeAreaView style={{ flex: 1, }}>
        {/* <StatusBar backgroundColor="blue" barStyle={'dark-content'}/> */}
          <View style={{...styles.buttonsContainer}}>
            <View style={{ flex: 1, }}>
              <TouchableOpacity onPress={this.createOffer}>
                <View style={styles.button}>
                  <Text style={{ ...styles.textContent, }}>Call</Text>
                </View>
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1, }}>
              <TouchableOpacity onPress={this.createAnswer}>
                <View style={styles.button}>
                  <Text style={{ ...styles.textContent, }}>Answer</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={{ ...styles.videosContainer, }}>
          
              <View style={{flex: 1 }}>
                {/* <TouchableOpacity onPress={() => this.state.localStream._tracks[1]._switchCamera()}> */}
                  <View>
                  <RTCView
                    // key={1}
                    // zOrder={0}
                    objectFit='cover'
                    style={{ ...styles.rtcView }}
                    streamURL={this.state.localStream && this.state.localStream.toURL()}
                    />
                  </View>
                {/* </TouchableOpacity> */}
              </View>
          </View>


          <ScrollView style={{ ...styles.scrollView }}>
            <View style={{
              flex: 1,
              width: '100%',
              backgroundColor: 'black',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              { remoteVideo }
            </View>
          </ScrollView>
        </SafeAreaView>
      );
  }
};

const styles = StyleSheet.create({
  buttonsContainer: {
    flexDirection: 'row',
  },
  button: {
    margin: 5,
    paddingVertical: 10,
    backgroundColor: 'lightgrey',
    borderRadius: 5,
  },
  textContent: {
    fontFamily: 'Avenir',
    fontSize: 20,
    textAlign: 'center',
  },
  videosContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    marginLeft: 20
  },
  rtcView: {
    width: 300, //dimensions.width,
    height: 200,//dimensions.height / 2,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
    // flexDirection: 'row',
    backgroundColor: 'teal',
    padding: 15,
  },
  rtcViewRemote: {
    width: dimensions.width - 30,
    height: 300,//dimensions.height / 2,
    backgroundColor: 'black',
  }
});

export default App;
