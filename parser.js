const fs = require('fs')

var logStream = fs.createWriteStream('recordings.csv', {'flags': 'a'});

// Linux stty -F /dev/ttyUSB0 9600 raw
// let serial = fs.createReadStream('/dev/ttyUSB0')

let serial = fs.createReadStream('/dev/cu.wchusbserial1440')
serial.on('data', (chunk) => {
    if(chunk.length > 13) {
        var timestamp = new Date()
        /** @type {string} */
        let rawValue = chunk.toString('utf8', 0, 7)
        let statusBytes = chunk.readUInt32LE(7)
        let match = rawValue.match(/^([-+])(\d{4})\s(\d)/)
        if(match) {
            let sign = match[1]
            let value = parseInt(match[2])
            let decimialPoint = match[3]
            if(sign === '-') {
                value = value * -1
            }
            if (decimialPoint === '3') {
                value = value / 10
            }
            if (decimialPoint === '2') {
                value = value / 100
            }
            if (decimialPoint === '1') {
                value = value / 1000
            }

            let info = {}
            let keys = [
                // First byte
                'BPN', 'HOLD', 'REL', 'AC', 'DC', 'AUTO', 'unused1', 'unused2',
                // Second byte
                'Z3', 'n', 'Bat', 'APO', 'MIN', 'MAX', 'Z2', 'Z1',
                // Third byte
                'Z4', '%', 'Diode', 'Beep', 'M', 'k', 'm', 'u', 
                // Fourth byte
                'F.', 'C.', 'F', 'Hz', 'hFE', 'Omh', 'A', 'V'
            ]
            keys.forEach((key, i) => {
                info[key] = (statusBytes >> i) & 1 
            })
            //console.log(JSON.stringify(info, null, 2))

            let unit = ''
            if(info['m'] && info['A']) {
                unit = 'mA'
            } else if(info['u'] && info['A']) {
                unit = 'uA'
            } else if(info['A']) {
                unit = 'A'
            } else if(info['m'] && info['V']) {
                unit = 'mV'
            } else if(info['V']) {
                unit = 'V'
            } else if(info['C.']) {
                unit = 'C'
            } else if(info['F.']) {
                unit = 'F'
            } else if(info['Hz']) {
                unit = 'Hz'
            } else if(info['Ohm']) {
                unit = 'Ohm'
            }

            let logLine = `${value},${unit},${timestamp.toISOString()}`
            logStream.write(logLine + '\n')
            //console.log()
        }
    } else {
        console.error(`Could not parse: '${chunk.toString()}'`)
    }
})
