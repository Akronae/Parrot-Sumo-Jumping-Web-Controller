'use strict'
// General
const fs = require('fs')
// Network
const app = require('express')()
const server = require('http').createServer(app)
const io = require('socket.io')(server)
// Drone
const sumo = require('node-sumo')
var drone = sumo.createClient()
const canRun = true
const runTime = 1000
var video = drone.getVideoStream()
var buffer = null



// Entry point
drone.connect( () => {
    startServer(8080, startSocket() )
    setTimeout( () => {
        startEvents(drone)
        initDrone(drone)
    }, 2000)


    // Security
    setTimeout( () => { drone.stop() }, runTime )
})

function startServer(port, cb) {
    app.get('/', (req, res) => {
        res.sendFile('views/index.html', {root: './'})
    })
    app.get('/video', (req, res) => {
        res.writeHead(200, {"Content-Type": 'video/mp4'})
        startVideoStream(video, res);
    })
    app.get('*/views/*', (req, res) => {
        res.sendFile(req.url, {root: './'})
    })
    app.get('*/node_modules/*', (req, res) => {
        res.sendFile(req.url, {root: './'})
    })
    server.listen(port, console.log('Server listening on port: ' + port))
    cb
}

function startSocket() {
    io.on('connection', (socket) => {
        console.log('Socket connected!')

        socket.on('move', (data) => { move(drone, data) })
        socket.on('stop', () => { drone.stop(); })
        socket.on('posture', (posture) => { drone[posture]() })
        socket.on('reqPosture', () => { socket.emit('resPosture', drone.posture) })

          drone.on( 'battery', ( battery ) => {
             console.log( 'Drone\'s battery: ' + battery + '%' )
             drone.battery = battery
             socket.emit('battery', battery / 100)
         })
         drone.on('postureStanding', () => { drone.posture = 'Standing'; socket.emit('resPosture', drone.posture); })
         drone.on('postureJumper', () => { drone.posture = 'Jumping'; socket.emit('resPosture', drone.posture); })
         drone.on('postureKicker', () => { drone.posture = 'Kicker'; socket.emit('resPosture', drone.posture); })
         setInterval( () => { socket.emit('resPosture', drone.posture); socket.emit('battery', drone.battery / 100) }, 1000)


    })
}

function initDrone(drone) {
    drone.isReady = true
    drone.battery = undefined
    drone.motor = 'OK'
    drone.posture = 'Jumping'
    drone.postureJumper()
}

function main(drone) {
    if ( canRun && drone.isReady) {
        drone.postureJumper()

    } else console.log( 'Drone is connected but don\'t get right to run..' )
}

function move(drone, data) {
    switch (data) {
        case 'forward':
            drone.forward(110)
            break;
        case 'left':
            drone.left(30)
            break;
        case 'backward':
            drone.backward(110)
            break;
        case 'right':
            drone.right(30)
            break;
        case 'longJump':
            drone.postureJumper()
            drone.animationsLongJump()
            setTimeout( () => { drone.postureJumper() }, 2500)
            break;
        case 'hightJump':
            drone.postureJumper()
            drone.animationsHighJump()
            break;
        default:
            console.log('Received undefined move data..');
    }
}

function stop(drone) {
    drone.stop()
}

function startEvents( drone, socket ) {
    drone.on('ready', ( bool ) => {
        drone.isReady = true
        setTimeout( () => { console.log('Drone\'s core: ' + drone.isReady + ' | Drone\'s battery: ' + drone.battery + '%' + ' | Drone\'s motor: ' + drone.motor) }, 1000)
        main(drone)
    })

     drone.on( 'batteryLow', () => {
         console.log('Drone\'s battery is low !')
     })


     drone.on( 'batteryCritical', () => {
         console.log('Drone\'s battery is critical ! Preparing to shutdown..')
         shutdown(drone)
     })

     drone.on('jumpMotorOk', () => {
         drone.motor = 'OK'
     })

     drone.on('jumpMotorErrorBlocked', () => {
         console.log('Drone\s motor is currently blocked ! Preparing to shutdown motor..')
         drone.motor = 'BLOCKED'
         shutdown(drone)
     })

     drone.on('jumpMotorErrorOverheated', () => {
         console.log('Drone\'s motor is overheated ! Preparing to shutdown motor..')
         shutdown(drone)
     })

}

function startVideoStream(video, req) {
    video.on('data', (data) => { buffer = data; console.log(data) })

    setInterval( () => {
        if ( buffer === null ) return;

        try {
            fs.createReadStream(buffer)
            rs.pipe(res)
        }
        catch(err) { console.log('Error while reading video stream ! | ' + err) }
    }, 100)
}

function shutdown(drone) {
    console.log('Shutting down drone\'s motor..')
    drone.stop()
    drone.postureJumper()

}
