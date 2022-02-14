
// eslint-disable-next-line no-unused-vars
import { GoGenerator } from '@asyncapi/modelina';
import { AsyncAPIDocument } from '@asyncapi/parser';
import { pascalCase, getMessageType } from '../utils';

/**
 * @typedef TemplateParameters
 * @type {object}
 * @property {boolean} generateTestClient - whether or not test client should be generated.
 * @property {boolean} promisifyReplyCallback - whether or not reply callbacks should be promisify.
 */

/**
 * @typedef RenderArgument
 * @type {object}
 * @property {AsyncAPIDocument} asyncapi received from the generator.
 * @property {TemplateParameters} params received from the generator.
 */


/**
 * Function to render file.
 * 
 * @param {RenderArgument} param0 render arguments received from the generator.
 */
export default function index({ asyncapi, params }) {

    const publishChannelCode = Object.entries(asyncapi.channels()).filter(([_, channel]) => { return channel.hasPublish() }).map(([channelName, channel]) => {
        return `
func (s *NatsClient) publishTo${pascalCase(channelName)}(m ${getMessageType(channel.publish().message(0))}) error {
    return s.nc.Publish("${channelName}", m)
}
`
    });
    const subscribeChannelCode = Object.entries(asyncapi.channels()).filter(([_, channel]) => { return channel.hasSubscribe() }).map(([channelName, channel]) => {
        const generator = new GoGenerator();
        const payloadType = generator.renderStruct
        return `
func (s *NatsClient) subscribeTo${pascalCase(channelName)}(callback func(${getMessageType(channel.publish().message(0))})) (*nats.Subscription, error) {
	return s.nc.Subscribe("${channelName}", callback)
}
`
    });

    return (
        <File name="nats_client.go">
            {`
package server

import (
	"github.com/nats-io/nats-rest-config-proxy/internal/models"
	"github.com/nats-io/nats.go"
)

type NatsClient struct {
	// nc is the encoded connection
	nc *nats.EncodedConn
}

// NewServer returns a configured server.
func NewNatsClient(opts *Options) *NatsClient {
	if opts == nil {
		opts = &Options{}
	}
	return &NatsClient{opts: opts}
}

func (s *NatsClient) connectToX() {
	nc, _ := nats.Connect(nats.DefaultURL)
	c, _ := nats.NewEncodedConn(nc, nats.JSON_ENCODER)
	defer c.Close()
	s.nc = c
}

${publishChannelCode.join('\n')}

${subscribeChannelCode.join('\n')}
  `}
        </File>
    );
}
