/* eslint-disable react/jsx-one-expression-per-line */
import React, { Component } from 'react';
import qs from 'querystring';
import styled from 'styled-components';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import useToggle from 'react-use/lib/useToggle';
import { fromUnitToToken } from '@arcblock/forge-util';
import CircularProgress from '@material-ui/core/CircularProgress';
import { 
  LocaleProvider, 
  Upload, 
  Icon, 
  Modal, 
  Button, 
  message, 
  Typography, 
  Input, 
  Tooltip 
} from "antd";
import zh_CN from 'antd/lib/locale-provider/zh_CN'
import reqwest from 'reqwest';
import 'antd/dist/antd.css';
import Auth from '@arcblock/did-react/lib/Auth';

import Layout from '../components/layout';
import useSession from '../hooks/session';
import forge from '../libs/sdk';
import api from '../libs/api';
import env from '../libs/env';
import { forgeTxValueSecureConvert } from '../libs/crypto';

const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;

const admin_account = env.appAdminAccounts;
const isProduction = process.env.NODE_ENV === 'production';
const sleep = timeout => new Promise(resolve => setTimeout(resolve, timeout));

const article_home_href = '/newsflash#type=articles'

class App extends Component {  
  static async getInitialProps({pathname, query, asPath, req}) {
    console.log('getInitialProps query=', query);
    
    /*wait tx on chain when callback from wallet*/
    const wback_ts = query._t_;
    if(typeof(wback_ts) != "undefined" && wback_ts && wback_ts.length > 0){
      console.log('getInitialProps wait tx to chain start');
      await sleep(3000);
      console.log('getInitialProps wait tx to chain ended');
    }
    
    return {};
  }
  
  constructor(props) {
    super(props);
    
    /*initial state*/
    this.state = {
      session: null,
      asset_did: '',
      news_item: null,
      user_payment_tx: null,
      open_payment: false,
      user_to_pay: null,
    };
  }
  
  /*Fetch App data*/
  fetchAppData = async () => {
    try {
      const { status, data} = await api.get('/api/session');
      this.setState({
        session: data
      }, ()=>{
        this.fetchNewsItem();
      });
    } catch (err) {
    }
  }
  
  /*Fetch news item */
  fetchNewsItem = async () => {
    try {
      reqwest({
        url: '/api/newsflashget',
        method: 'get',
        data: {
          cmd: 'getNewsItem',
          asset_did: this.state.asset_did,
        },
        type: 'json',
      }).then(data => {
        this.setState({
          news_item: data
        }, ()=>{
          if(this.state.news_item){
            this.fetchUserPaymentTx();
          }else{
            window.location.href = article_home_href;
          }
        });
      });
    } catch (err) {
    }
  }
  
  /*Fetch user payment tx */
  fetchUserPaymentTx = async () => {
    const { 
      news_item
    } = this.state;
    
    const { 
      user, 
      token,
    } = this.state.session;  
    
    try {
      reqwest({
        url: '/api/payments',
        method: 'get',
        data: {
          module: 'article',
          user_did: user.did,
          asset_did: this.state.asset_did
        },
        type: 'json',
      }).then(data => {
        this.setState({
          user_payment_tx: data
        }, ()=>{
          var user_payed_value = 0;
          var user_to_pay = 0;
          
          //console.log('fetchUserPaymentTx user_payment_tx=', this.state.user_payment_tx);
          
          if (this.state.user_payment_tx) {
            for(var i=0;i<this.state.user_payment_tx.length;i++){
              user_payed_value += parseFloat(fromUnitToToken(this.state.user_payment_tx[i].tx.itxJson.value, token.decimal));
            }
          }
          
          console.log('fetchUserPaymentTx user_payed_value=', user_payed_value);
          
          if(user_payed_value < news_item.news_article_worth){
            user_to_pay = forgeTxValueSecureConvert(news_item.news_article_worth - user_payed_value);
          }
          
          console.log('fetchUserPaymentTx user_to_pay=', user_to_pay);
          
          //asset owner and super admin don't need to pay in production release
          if (isProduction && (user.did == news_item.author_did || -1 != admin_account.indexOf(user.did))){
            user_to_pay = 0;
          }
  
          if(user_to_pay > 0){
            this.setState({
              open_payment: true,
              user_to_pay: user_to_pay,
            }, ()=>{
            });
          }else{
            this.setState({
              open_payment: false,
              user_to_pay: 0,
            }, ()=>{
            });
          }
          
        });
      });
    } catch (err) {
    }
  }
  
  /*component mount process*/
  componentDidMount() {
    const location_hash = window.location.hash.slice(1);
    const location_search = window.location.search.slice(1);
    
    if(typeof(location_search) != "undefined" && location_search && location_search.length > 0) {
      const params = qs.parse(location_search);
      
      if(params.asset_did){
        this.setState({
          asset_did: params.asset_did
        },()=>{
          console.log('componentDidMount asset_did=', this.state.asset_did);
          
          /*fetch data*/
          this.fetchAppData();
        });
      }else{
        window.location.href = article_home_href;
        return null;
      }
    }else{
       window.location.href = article_home_href;
       return null;
    }
    
    if(typeof(location_hash) != "undefined" && location_hash && location_hash.length > 0) {
      const hashArr = location_hash.split('?');
      const params = qs.parse(hashArr[0]);
    }
  }
  
  /*component unmount process*/
  componentWillUnmount() {
  }
  
  onPaymentClose = async result => {
    window.location.href = article_home_href;
  };

  onPaymentError = async result => {
    window.location.href = article_home_href;
  };

  onPaymentSuccess = async result => {
    /*wait payment to chain*/
    await sleep(3000);
  
    /*reload window*/
    window.location.reload();
  };
  
  render() {
    const { 
      session,
      asset_did, 
      news_item,
      open_payment,
      user_to_pay
    } = this.state;
    //console.log('render session=', session);
    //console.log('render props=', this.props);
    
    if (!session || !news_item || user_to_pay === null) {
      return (
        <Layout title="Article">
          <Main>
            <CircularProgress />
          </Main>
        </Layout>
      );
    }
    
    if ( isProduction && !session.user) {
      console.log('render user not exist');
      window.location.href = '/?openLogin=true';
      return null;
    }
    
    const { user, token } = session;
    //console.log('render session.user=', user);
    //console.log('render session.token=', token);
    
    //payment parameter
    const toPay = String(user_to_pay);
    const dapp = 'article';
    const para_obj = {asset_did: asset_did};
    const para = JSON.stringify(para_obj);
    
    return (
      <Layout title="Article">
        <Main>
          <LocaleProvider locale={zh_CN}>
            <div className="clearfix">
            </div>
          </LocaleProvider>
        </Main>
        {open_payment && (
        <Auth
          responsive
          action="payment"
          locale="zh"
          checkFn={api.get}
          onError={this.onPaymentError}
          onClose={this.onPaymentClose}
          onSuccess={this.onPaymentSuccess}
          extraParams={ "zh", { toPay, dapp, para } }
          messages={{
            title: '支付需求',
            scan: `该内容需支付 ${toPay} ${token.symbol}`,
            confirm: '在ABT钱包中确认',
            success: '支付成功!',
          }}
        />
      )}
      </Layout>
    );
  }
}

const Main = styled.main`
  margin: 20px 0 0;
  
`;

export default App;