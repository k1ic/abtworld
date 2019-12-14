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
          {/*<Typography component="h2" variant="h4" className="page-header" color="primary">
            关于ABT世界 - <a href='/'>abtworld.cn</a>
          </Typography>
          <Typography component="p" variant="h6" className="page-description" color="textSecondary">
            欢迎进入ABT世界，这里是链网世界的入口，用于收录和展示ABT生态产品。
          </Typography>*/}
          <Typography component="h2" variant="h5" className="page-header" color="primary" style={{ fontSize: '16px' }}>
            图片
          </Typography>
          <Typography component="p" variant="h6" className="page-description" color="textSecondary" style={{ fontSize: '15px' }}>
            1. 每个付费图片拥有唯一的DID，支付数据上链不可篡改，支付后用户拥有该资产的永久浏览权; <br/>
            2. 用户付费后，资产拥有者的DID账户中将实时收到60%收益; <br/>
            3. 资产的所有权归属于用户，和平台无关，如发现侵权，可联系下架！<br/>
          </Typography>
          <Typography component="h2" variant="h5" className="page-header" color="primary" style={{ fontSize: '16px' }}>
            资讯
          </Typography>
          <Typography component="p" variant="h6" className="page-description" color="textSecondary" style={{ fontSize: '15px' }}>
            1. 使用DID身份发布，数据上链不可篡改，内容全球可见，请谨慎发布；<br/>
            2. 转发的内容请备注来源，尊重原创；<br/>
            3. 用户有权勒令管理员对侵犯其隐私或著作权的内容采取屏蔽显示措施（链上数据无法删除）；<br/>
            4. DID身份言论自由，但自由的前提是承认他人自由，被尊重的同时要也尊重他人；<br/>
            5. 禁止黄赌毒，政治，极端、激进、攻击或侮辱性的言论。
          </Typography>
          <Typography component="h2" variant="h5" className="page-header" color="primary" style={{ fontSize: '16px' }}>
            联系方式
          </Typography>
          <Typography component="p" variant="h6" className="page-description" color="textSecondary" style={{ fontSize: '15px' }}>
            QQ：2439897034 <br/>
            邮箱：2439897034@qq.com <br/>
            <QrCode value={"https://abtworld.cn"} size={200} level={'L'} includeMargin={true} id="AbworldQrCode" style={{ marginRight: 30 }} />
          </Typography>
        </Main>
      </Layout>
    );
  }
}

const Main = styled.main`
  margin: 30px 0 0;

  .page-header {
    margin-bottom: 20px;
  }

  .page-description {
    margin-bottom: 10px;
  }

`;

export default App;
