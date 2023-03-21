module.exports = function (RED) {
  'use strict'

  const axios = require('axios')
  const curlirize = require('axios-curlirize')
  const path = require('path')
  const packageJson = require(path.join(__dirname, '../../', 'package.json'))

  function VictronDynamicEss (config) {
    RED.nodes.createNode(this, config)

    const node = this

    node.on('input', function (msg) {
      const url = msg.url || 'https://vrmapi.victronenergy.com/v2'

      if (!config.vrmtoken && !msg.vrmtoken) {
        node.status({ fill: 'red', shape: 'dot', text: 'No VRM token set' })
        return
      }

      if (!config.site_id && !msg.site_id) {
        node.status({ fill: 'red', shape: 'dot', text: 'No VRM ID token set' })
        return
      }

      if (!config.long && !msg.long) {
        node.status({ fill: 'red', shape: 'dot', text: 'No longitude set' })
        return
      }

      if (!config.lat && !msg.lat) {
        node.status({ fill: 'red', shape: 'dot', text: 'No latitude token set' })
        return
      }
      msg.topic = 'VRM dynamic ess'
      msg.payload = null

      const msgsp = {
        topic: 'ideal setpoint',
        payload: null
      }

      const options = {
        site_id: (msg.site_id || config.site_id).toString(),
        b_max: (msg.b_max || config.b_max || 1).toString(),
        tb_max: (msg.tb_max || config.tb_max || 1).toString(),
        fb_max: (msg.fb_max || config.fb_max || 1).toString(),
        tg_max: (msg.tg_max || config.tg_max || 1).toString(),
        fg_max: (msg.fg_max || config.fg_max || 1).toString(),
        p_offset: (msg.p_offset || config.p_offset || 0).toString(),
        b_cost: (msg.b_cost || config.b_cost || 0).toString(),
        long: (msg.long || config.long).toString(),
        lat: (msg.lat || config.lat).toString(),
        country: (msg.country || config.country || 'nl').toUpperCase()
      }
      const headers = {
        'X-Authorization': 'Token ' + config.vrmtoken,
        accept: 'application/json',
        'User-Agent': 'dynamic-ess/' + packageJson.version
      }

      if (config.verbose === true) {
        node.warn({
          url,
          options,
          headers
        })
      } else {
        node.warn('not verbose')
      }

      node.status({ fill: 'yellow', shape: 'ring', text: 'Retrieving setpoint' })
      axios.get(url, { params: options, headers }).then(function (response) {
        if (response.status === 200) {
          msg.payload = response.data
          node.status({ fill: 'green', shape: 'dot', text: 'Ok' })
          const d = new Date()
          const hour = d.getHours()
          if (msg.payload.schedule) {
            msgsp.payload = msg.payload.schedule[hour] * 1000
            msgsp.payload = Number(msgsp.payload.toFixed(0))
          }
        } else {
          node.status({ fill: 'yellow', shape: 'dot', text: response.status })
        }

        node.send([msgsp, msg])
      }).catch(function (error) {
        node.status({ fill: 'red', shape: 'dot', text: 'Error fetching VRM data' })
        node.warn(error)
      })
    })

    node.on('close', function () {
    })

    if (config.verbose) {
      curlirize(axios)
    }
  }

  RED.nodes.registerType('victron-dynamic-ess', VictronDynamicEss)
}