/* eslint-disable react/jsx-one-expression-per-line */
import React, { Component } from 'react';
import styled from 'styled-components';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import useToggle from 'react-use/lib/useToggle';
import { fromUnitToToken } from '@arcblock/forge-util';

import Grid from '@material-ui/core/Grid';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import CircularProgress from '@material-ui/core/CircularProgress';
import Auth from '@arcblock/did-react/lib/Auth';
import Avatar from '@arcblock/did-react/lib/Avatar';
import 'antd/dist/antd.css';
import * as QrCode from 'qrcode.react'

import Layout from '../components/layout';
import useSession from '../hooks/session';
import forge from '../libs/sdk';
import api from '../libs/api';

class App extends Component {  
  static async getInitialProps({pathname, query, asPath, req}) {
    console.log('getInitialProps query=', query);
    return {};
  }
  
  constructor(props) {
    super(props);
    
    /*initial state*/
    this.state = {
      session: null,
    };
  }
  
  /*Fetch App data*/
  async fetchAppData(){
    try {
      const { status, data} = await api.get('/api/session');
      this.setState({session: data});
    } catch (err) {
    }
    return {};
  }
  
  /*component mount process*/
  componentDidMount() {
    //this.fetchAppData();
  }
  
  /*component unmount process*/
  componentWillUnmount() {
  }
  
  render() {
    //const session = this.state.session;
    //console.log('render session=', session);
    //console.log('render props=', this.props);
    
    //if (!session) {
    //  return (
    //    <Layout title="Template">
    //      <Main>
    //        <CircularProgress />
    //      </Main>
    //    </Layout>
    //  );
    //}
    
    //if ( isProduction && !session.user) {
    //  console.log('render user not exist');
    //  window.location.href = '/?openLogin=true';
    //  return null;
    //}
    
    //const { user, token } = session;
    //console.log('render session.user=', user);
    //console.log('render session.token=', token);
    
    return (
      <Layout title="About">
        <Main>
          <Typography component="h2" variant="h4" className="page-header" color="primary">
            关于ABT世界 - <a href='/'>abtworld.cn</a>
          </Typography>
          <Typography component="p" variant="h6" className="page-description" color="textSecondary">
            欢迎进入ABT世界，这里是链网世界的入口，用于收录和展示ABT生态产品。
          </Typography>
          <Typography component="h2" variant="h5" className="page-header" color="primary">
            关于付费资产
          </Typography>
          <Typography component="p" variant="h6" className="page-description" color="textSecondary">
            每个付费资产拥有唯一的DID，支付数据上链不可篡改，支付后用户拥有该资产的永久浏览权; <br/>
            用户付费后，资产拥有者的DID账户中将实时收到60%收益; <br/>
            资产的所有权归属于用户，和平台无关，如发现侵权，可联系下架！<br/>
          </Typography>
          <Typography component="h2" variant="h5" className="page-header" color="primary">
            联系方式
          </Typography>
          <Typography component="p" variant="h6" className="page-description" color="textSecondary">
            QQ：2439897034 <br/>
            邮箱：2439897034@qq.com <br/>
            <QrCode value={"http://abtworld.cn"} size={200} level={'L'} fgColor={"#339966"} bgColor={"#D3D3D3"} includeMargin={true} id="AbworldQrCode" style={{ marginRight: 30 }} />
            <QrCode value={"http://abtworld.cn/newsflash"} size={200} level={'L'} fgColor={"#006699"} bgColor={"#D3D3D3"} includeMargin={true} id="HashNewsQrCode" style={{ marginRight: 30 }} />
            <QrCode value={"http://abtworld.cn/didchat"} size={200} level={'L'} fgColor={"#339966"} bgColor={"#D3D3D3"} includeMargin={true} id="DIDChatQrCode"/>
          </Typography>
        </Main>
      </Layout>
    );
  }
}

const Main = styled.main`
  margin: 50px 0 0;

  .page-header {
    margin-bottom: 20px;
  }

  .page-description {
    margin-bottom: 10px;
  }

`;

export default App;
