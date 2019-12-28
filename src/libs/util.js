/* eslint-disable no-underscore-dangle */
require('dotenv').config();
import env from './env';

export function getExplorerUrl(pathname, chainHost=env.assetChainHost){
  const exp_url = chainHost.replace('/api', '/node/explorer'+pathname);
  return exp_url;
};
