﻿/* eslint-disable react/jsx-one-expression-per-line */
import React, { Component } from 'react';
import styled from 'styled-components';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import useToggle from 'react-use/lib/useToggle';
import { fromUnitToToken } from '@arcblock/forge-util';
import Avatar from '@arcblock/did-react/lib/Avatar';
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
  Tooltip,
  List,
  Select,
  Tabs,
  Switch
} from "antd";
import zh_CN from 'antd/lib/locale-provider/zh_CN'
import reqwest from 'reqwest';
import 'antd/dist/antd.css';
import Auth from '@arcblock/did-react/lib/Auth';
//import moment from 'moment';
import * as QrCode from 'qrcode.react';
import * as html2canvas from 'html2canvas';

import Layout from '../components/layout';
import useSession from '../hooks/session';
import forge from '../libs/sdk';
import api from '../libs/api';
import env from '../libs/env';
import { forgeTxValueSecureConvert, HashString } from '../libs/crypto';
import { getCurrentTime } from '../libs/time';
import { getUserDidFragment } from '../libs/user';

const sleep = timeout => new Promise(resolve => setTimeout(resolve, timeout));

const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;
const { TabPane } = Tabs;


const isProduction = process.env.NODE_ENV === 'production';
const admin_account = env.appAdminAccounts;

/*direct or indirect*/
const news_to_chain_mode = 'indirect';
var news_content_max_length = 0;
const list_items_per_page = 20;
const news_comment_max_length = 100;

/*news type default value*/
const news_type_default = 'chains';

/*pay valye*/
const toPayEachChar = 0.001;
const dPointNumMax = 6;

/*poster window width*/
const posterWinWidth = 300;
var share_news_pic_data = '';

/*send permistion list*/
const ama_send_perm_udid = [ 'z1ZLeHSJfan2WB1vSnG7CS8whxBagCoHiHo' ];

const renderCommentList = (x, token) => (
  <span className="antd-list-comment-list-item-text">
    <span style={{ fontSize: '14px', color: '#3CB371' }}>{x.uname}：</span>
    <span style={{ fontSize: '14px', color: '#0' }}>{x.comment}</span>
    {(x.mbalance>0)?<span style={{ fontSize: '10px', color: '#FF6600' }}> +{x.mbalance} {token.symbol}</span>:''}
    <br/>
  </span>
);

class App extends Component {  
  static async getInitialProps({pathname, query, asPath, req}) {
    //console.log('getInitialProps pathname=', pathname);
    console.log('getInitialProps query=', query);
    //console.log('getInitialProps asPath=', asPath);
    //console.log('getInitialProps req=', req);
    return {};
  }
  
  constructor(props) {
    super(props);
    //console.log('newsflash props=', props);
    
    /*initial state*/
    this.state = {
      session: null,
      intervalIsSet: false,
      news_type: news_type_default,
      news_to_send: '',
      toPay: 0,
      asset_did: '',
      show_mode: 'all',
      newsflash_list: [],
      sending: false,
      loading: false,
      minning: false,
      comment_input_visible: false,
      comment_to_send: '',
      gen_share_news_visible: false,
      share_news_pic_visible: false,
    };
    
    this.comment_asset_did = '';
    this.share_asset_did = '';
    this.share_news_items = [];
    this.winW = 0;
    this.winH = 0;
    this.onListItemActionClick = this.onListItemActionClick.bind(this);
  }
  
  /*Fetch App data*/
  async fetchAppData(){
    try {
      const { status, data} = await api.get('/api/session');
      this.setState({
        session: data
      },()=>{
        this.fetchNewsFlash();
      });
    } catch (err) {
    }
    return {};
  }
  
  /*Fetch news flash */
  fetchNewsFlash = (params = {}) => {
    var udid = '';
    if(this.state.loading === true){
      console.log('fetchNewsFlash is loading');
      return;
    }
    
    console.log('Start fetchNewsFlash');
    
    this.setState({
      loading: true
    });
      
    var udid_to_show = '';
    if(this.state.session && this.state.session.user){
      udid = this.state.session.user.did;
      if(this.state.show_mode === 'mine'){
        udid_to_show = this.state.session.user.did;
      }
    }
    
    reqwest({
      url: '/api/payments',
      method: 'get',
      data: {
        module: 'newsflash',
        news_type: this.state.news_type,
        udid: udid,
        udid_to_show: udid_to_show,
        ...params,
      },
      type: 'json',
    }).then(data => {
      
      console.log('End fetchNewsFlash');
      //if(data && data.length > 0){
      //  console.log(data.slice(0, 9));
      //}
      
      this.setState({
        newsflash_list: data,
        loading: false
      });
    });
  };
  
  /*component mount process*/
  componentDidMount() {    
    //console.log('componentDidMount hash=', window.location.hash.slice(1));
    const location_hash = window.location.hash.slice(1);
    if(typeof(location_hash) != "undefined" && location_hash && location_hash.length > 0) {
      const hashArr = location_hash.split('?');
      this.setState({news_type: hashArr[0]},()=>{
        console.log('componentDidMount news_type=', this.state.news_type);        
        this.fetchAppData();
      });
    }else{
      this.fetchAppData();
    }
    
    if (! this.state.intervalIsSet) {
      let interval = setInterval(this.fetchNewsFlash, 30000);
      this.setState({ intervalIsSet: interval});
    }
  }
  
  /*component unmount process*/
  componentWillUnmount() {
    if (this.state.intervalIsSet) {
      clearInterval(this.state.intervalIsSet);
      this.setState({ intervalIsSet: null});
    }
  }
  
  handleNewsTypeChange = value => {
    console.log('handleNewsTypeChange value=', value);
    
    this.setState({
      news_type: value,
      newsflash_list: []
    },()=>{
       window.location.hash = `#${value}`;
      this.fetchNewsFlash();
    });
  }
  
  onShowModeChange = checked => {
    var show_mode = '';
    if(checked){
      show_mode = 'all';
    }else{
      show_mode = 'mine';
    }
    this.setState({show_mode: show_mode},()=>{
      console.log('show mode change to', this.state.show_mode);
      this.fetchNewsFlash();
    });
  }
  
  onNewsToSendChange = ({ target: { value } }) => {
    //console.log('onNewsToSendChange value='+value+' length='+value.length);
    const contentLength = value.length;
    if(contentLength > 0){
      var toPay = toPayEachChar*contentLength;
      var dpoitNum = 0;
      const toPaySplit = toPay.toString().split(".");
      if(toPaySplit.length > 1){
        dpoitNum = toPaySplit[1].length;
      }else{
        dpoitNum = 0;
      }
      
      if(dpoitNum > dPointNumMax){
        toPay = toPay.toFixed(dPointNumMax);
      }
      this.setState({ toPay: toPay });
    }else{
      this.setState({ toPay: 0 });
    }
    this.setState({ news_to_send: value });
  };
  
  onCommentToSendChange = ({ target: { value } }) => {
    //console.log('onCommentToSendChange value='+value+' length='+value.length);
    this.setState({ comment_to_send: value });
  };
  
  /*Send news handler*/
  handleSendNews = () => {
    const { session, news_type, news_to_send } = this.state;
    const { user, token } = session;
    
    console.log('handleSendNews');
    
    if(news_to_send.length > 0){
      const asset_did = HashString('sha1', news_to_send);
      console.log('asset_did=', asset_did);
      
      if(news_to_chain_mode === 'direct'){
        this.setState({
          asset_did: asset_did,
          sending: true,
        });
      }else{
        const formData = new FormData();
        
        formData.append('user', JSON.stringify(user));
        formData.append('cmd', 'add');
        formData.append('asset_did', asset_did);
        formData.append('news_type', news_type);
        formData.append('news_content', news_to_send);
        
        reqwest({
          url: '/api/newsflashset',
          method: 'post',
          processData: false,
          data: formData,
          success: (result) => {
            //console.log('add newsflash success with response=', result.response);
            this.setState({
              asset_did: asset_did,
              sending: true,
            });
          },
          error: (result) => {
            console.log('add newsflash error with response=', result.response);
            Modal.error({title: '发布失败'});
          },
        });
      }
    }
  };
  
  newsflashListItemFind = asset_did => {
    const {newsflash_list} = this.state;
    var newsflashItem = null;
    
    if(!newsflash_list || newsflash_list.length == 0){
      return null;
    }
    
    newsflashItem = newsflash_list.find( function(x){
      return x.asset_did === asset_did;
    });
    
    return newsflashItem;
  }
  
  newsflashListItemLikeStatusGet = (item, userDid) => {
    var likeStatus = false;
    var like_list_item = null;
    
    if(item && item.like_list && item.like_list.length > 0){
      like_list_item = item.like_list.find( function(x){
        return x.udid === userDid;
      });
      if(like_list_item){
        likeStatus = true;
      }
    }
    
    return likeStatus;
  }
  
  newsflashListItemForwardStatusGet = (item, userDid) => {
    var forwardStatus = false;
    var forward_list_item = null;
    
    if(item && item.forward_list && item.forward_list.length > 0){
      forward_list_item = item.forward_list.find( function(x){
        return x.udid === userDid;
      });
      if(forward_list_item){
        forwardStatus = true;
      }
    }
    
    return forwardStatus;
  }
  
  onListItemActionClick = async (action_type, asset_did) => {
    const { session, newsflash_list } = this.state;
    const { user, token } = session;
    var newsflashItem = this.newsflashListItemFind(asset_did);
    
    console.log('onListItemActionClick action_type=', action_type, 'asset_did=', asset_did);
    
    if(!newsflashItem){
      console.log('onListItemActionClick invalid newsflash item');
      return null;
    }
    
    if(!user){
      window.location.href = '/newsflash?openLogin=true';
      return null;
    }
    
    /*Disable auto refresh*/
    if (this.state.intervalIsSet) {
      clearInterval(this.state.intervalIsSet);
      this.setState({ intervalIsSet: null});
    }
    
    switch(action_type){
      case 'like':
        /*verify if already liked*/
        if(this.newsflashListItemLikeStatusGet(newsflashItem, user.did)){
          Modal.success({title: '已赞过'});
        }else{
          newsflashItem.like_cnt += 1;
          const like_list_item = {
           udid: user.did,
           mbalance: 0
          };
          newsflashItem.like_list.push(like_list_item);
          newsflashItem.like_status = true;
          
          /*send like minning request*/
          this.setState({
            minning: true
          });
          
          const formData = new FormData();
          formData.append('user', JSON.stringify(user));
          formData.append('cmd', 'give_like');
          formData.append('asset_did', asset_did);
        
          reqwest({
            url: '/api/newsflashset',
            method: 'post',
            processData: false,
            data: formData,
            success: (result) => {
              console.log('like minning success with response=', result.response);
              if(parseFloat(result.response) > 0){
                newsflashItem.like_min_rem -= parseFloat(result.response);
                newsflashItem.like_min_rem = forgeTxValueSecureConvert(newsflashItem.like_min_rem);
                const modal_content = '获得'+result.response+token.symbol+" 请到ABT钱包中查看!";
                Modal.success({title: modal_content});
              }else{
                console.log('like minning poll is empty');
              }
              this.setState({
                minning: false
              });
            },
            error: (result) => {
              console.log('like minning error with response=', result.response);
              this.setState({
                minning: false
              });
            },
          });
        }
        break;
      case 'comment':
        this.comment_asset_did = asset_did;
        this.setState({
          comment_to_send: '',
          comment_input_visible: true
        });
        break;
      case 'share':
        this.share_asset_did = asset_did;
        this.share_news_items[0] = newsflashItem;
        
        this.setState({
          gen_share_news_visible: true
        },()=>{
          share_news_pic_data = '';
          var opts = {
            dpi: window.devicePixelRatio * 4,
            scale: 4,
            useCORS: true
          };
          
          html2canvas(document.getElementById('shareNewsContent'), opts).then(function(canvas) {
            share_news_pic_data = canvas.toDataURL("image/jpg");            
          });
        });
        
        /*wait share news pic ready*/
        var wait_counter = 0;
        while(share_news_pic_data.length == 0){
          await sleep(1);
          wait_counter++;
          if(wait_counter > 15000){
            break;
          }
        }
        console.log('share news pic ready counter=', wait_counter);
        if(share_news_pic_data.length > 0){
          this.setState({
            gen_share_news_visible: false,
            share_news_pic_visible: true
          }, ()=>{
            let posterImage = document.getElementById("shareNewsPic");
            posterImage.src = share_news_pic_data;
          });
        }else{
          this.setState({
            gen_share_news_visible: false
          }, ()=>{
          });
          consolg.log('share news failure');
        }
        
        //html2canvas(document.getElementById(this.share_asset_did),{scale:1}).then(function(canvas) {
        //  let posterImage = document.getElementById("shareNewsPic")
        //  posterImage.src = canvas.toDataURL("image/jpg")
        //});
        
        break;
      default:
        break;
    }
    
  };
  
  IconText = ({ type, text, token_symbol, balance, action_type, like_status, asset_did }) => (
    <span className="antd-list-action-icon-text">
      <span className="antd-list-action-icon-text-balance">{balance}</span>
      {/*<img className="list-item-action-img" src="/static/images/hashnews/ABT.png" alt="ABT" height="25" width="25" />*/}
      <a onClick={e => {
          this.onListItemActionClick(action_type, asset_did);
        }}
      > 
        {action_type=='like'&&like_status==true?<Icon type={type} theme="twoTone" twoToneColor="#0000FF" style={{ marginLeft: 4, marginRight: 4 }} />:<Icon type={type} style={{ marginLeft: 8, marginRight: 8 }} />}
        {text}
      </a>
    </span>
  );
  
  CommentList = ({ asset_did, comment_cnt, comment_list, token }) => (
    <Paragraph className="antd-list-comment-list-text" ellipsis={{ rows: 6, expandable: true }}>
      {comment_list.map(x => renderCommentList(x, token))}
    </Paragraph>
  );
  
  handleCommentInputOk = e => {
    const { session, newsflash_list, comment_to_send } = this.state;
    const { user, token } = session;
    var newsflashItem = this.newsflashListItemFind(this.comment_asset_did);
    
    if(!newsflashItem){
      console.log('handleCommentInputOk invalid newsflash item');
      return null;
    }
  
    //verify input parameter
    if(!this.comment_asset_did || this.comment_asset_did.length == 0){
      console.log('handleCommentInputOk invalid comment_asset_did');
      return null;
    }
    if(!comment_to_send || comment_to_send.length == 0){
      console.log('handleCommentInputOk comment_to_send is empy');
      return null;
    }
  
    console.log('handleCommentInputOk, asset_did=', this.comment_asset_did);
    console.log('comment_to_send.length=', comment_to_send.length);
    //console.log('comment_to_send=', comment_to_send);
    
    var current_time = getCurrentTime();
    //console.log('current_time=', current_time);
    
    const uname_with_did = user.name+'('+getUserDidFragment(user.did)+')';
    var comment_list_item = {
      uname: uname_with_did,
      udid: user.did,
      time: current_time,
      comment: comment_to_send,
      mbalance: 0
    };
    
    /*send comment minning request*/
    this.setState({
      minning: true
    });
          
    const formData = new FormData();
    formData.append('user', JSON.stringify(user));
    formData.append('cmd', 'add_comment');
    formData.append('asset_did', this.comment_asset_did);
    formData.append('comment', comment_to_send);
        
    reqwest({
      url: '/api/newsflashset',
      method: 'post',
      processData: false,
      data: formData,
      success: (result) => {
        console.log('add comment minning success with response=', result.response);
        if(parseFloat(result.response) > 0){
          newsflashItem.comment_min_rem -= parseFloat(result.response);
          newsflashItem.comment_min_rem = forgeTxValueSecureConvert(newsflashItem.comment_min_rem);
          const modal_content = '获得'+result.response+token.symbol+" 请到ABT钱包中查看!";
          Modal.success({title: modal_content});
        }else{
          console.log('comment minning poll is empty');
        }
        
        newsflashItem.comment_cnt += 1;
        comment_list_item.mbalance = parseFloat(result.response);
        newsflashItem.comment_list.push(comment_list_item);
        
        this.setState({
          minning: false
        });
      },
      error: (result) => {
        console.log('comment minning error with response=', result.response);
        Modal.error({title: '评论失败，请检查是否刷屏!'});
        this.setState({
          minning: false
        });
      },
    });
    
    this.setState({
      comment_to_send: '',
      comment_input_visible: false
    },()=>{
      this.comment_asset_did = '';
    });
  };
  
  handleCommentInputCancel = e => {
    console.log('handleCommentInputCancel, asset_did=', this.comment_asset_did);
    
    this.setState({
      comment_to_send: '',
      comment_input_visible: false
    },()=>{
      this.comment_asset_did = '';
    });
  };
  
  handleGenShareNewsOk = e => {
    console.log('handleGenShareNewsOk, asset_did=', this.share_asset_did);
   
    this.setState({
      gen_share_news_visible: false
    },()=>{
    });
  };
  
  handleGenShareNewsCancel = e => {
    console.log('handleGenShareNewsCancel, asset_did=', this.share_asset_did);
    
    this.setState({
      gen_share_news_visible: false
    },()=>{
      this.share_asset_did = '';
    });
  };
  
  handleShareNewsPicOk = e => {
    const { session } = this.state;
    const { user, token } = session;
    
    console.log('handleShareNewsPicOk share_news_pic_data.length=', share_news_pic_data.length);
   
    var newsflashItem = this.newsflashListItemFind(this.share_asset_did);
    if(newsflashItem){
      newsflashItem.forward_cnt += 1;
      const forward_list_item = {
        udid: user.did,
        mbalance: 0
      };
      newsflashItem.forward_list.push(forward_list_item);
          
      /*send forward minning request*/
      this.setState({
        minning: true
      });
          
      const formData = new FormData();
      formData.append('user', JSON.stringify(user));
      formData.append('cmd', 'forward');
      formData.append('asset_did', this.share_asset_did);
        
      reqwest({
        url: '/api/newsflashset',
        method: 'post',
        processData: false,
        data: formData,
        success: (result) => {
          console.log('forward minning success with response=', result.response);
          if(parseFloat(result.response) > 0){
            newsflashItem.forward_min_rem -= parseFloat(result.response);
            newsflashItem.forward_min_rem = forgeTxValueSecureConvert(newsflashItem.forward_min_rem);
            const modal_content = '获得'+result.response+token.symbol+" 请到ABT钱包中查看!";
            Modal.success({title: modal_content});
          }else{
            console.log('forward minning poll is empty or already minned');
          }
          this.setState({
            minning: false
          });
        },
        error: (result) => {
          console.log('forward minning error with response=', result.response);
          this.setState({
            minning: false
          });
        },
      });
    }else{
      console.log('handleShareNewsPicOk unknown news item.');
    }
   
    this.setState({
      share_news_pic_visible: false
    },()=>{
      share_news_pic_data = '';
      this.share_asset_did = '';
    });
  };
  
  handleShareNewsPicCancel = e => {
    console.log('handleShareNewsPicCancel share_news_pic_data.length=', share_news_pic_data.length);
    
    this.setState({
      share_news_pic_visible: false
    },()=>{
      share_news_pic_data = '';
      this.share_asset_did = '';
    });
  };
  
  onPaymentClose = async result => {
    console.log('onPaymentClose');
    this.setState({
      sending: false,
    });
  };

  onPaymentError = async result => {
    console.log('onPaymentError');
    this.setState({
      sending: false,
    });
  };

  onPaymentSuccess = async result => {
    console.log('onPaymentSuccess');
    this.setState({
      news_to_send: '',
      toPay: 0,
      sending: false,
    });
    
    setTimeout(() => {
      try {
        this.fetchNewsFlash();
      } catch (err) {
        // Do nothing
      }
    }, 5000);
  };

  render() {
    const { session, news_type, news_to_send, comment_to_send, toPay, sending } = this.state;
    //console.log('render session=', session);
    //console.log('render props=', this.props);
    
    if (!session) {
      return (
        <Layout title="HashNews">
          <Main>
            <CircularProgress />
          </Main>
        </Layout>
      );
    }
    
    //if ( isProduction && !session.user) {
    //  console.log('render user not exist');
    //  window.location.href = '/?openLogin=true';
    //  return null;
    //}
    
    this.winW = window.innerWidth;
    this.winH = window.innerHeight;
    //console.log('render winW=', this.winW, 'winH=', this.winH);
    var commentInpuTopOffset = this.winH/2;
    if(commentInpuTopOffset == 0){
      commentInpuTopOffset = 20;
    }
    
    if(news_to_chain_mode === 'indirect'){
      news_content_max_length = 1000;
    }else{
      news_content_max_length = 100;
    }
    
    const { user, token } = session;
    //console.log('render session.user=', user);
    //console.log('render session.token=', token);
    
    const dapp = 'newsflash';
    var para_obj = null;
    var para = '';
    
    if(news_to_chain_mode === 'direct'){
      if(user){
         para_obj = {type: news_type, uname: user.name, content: news_to_send};
      }else{
         para_obj = {type: news_type, uname: '匿名', content: news_to_send};
      }
      para = JSON.stringify(para_obj);
    }else{
      para_obj = {asset_did: this.state.asset_did};
      para = JSON.stringify(para_obj);
    }
    
    //if(this.state.newsflash_list && this.state.newsflash_list.length > 0){
      //console.log('render newsflash_list=', this.state.newsflash_list);
      //console.log('render newsflash_list.length=', this.state.newsflash_list.length);
    //}
    
    /*send permission*/
    var send_permission = false;
    if(user){
      if(-1 != admin_account.indexOf(user.did)){
        send_permission = true;
      }else{
        switch(news_type){
          case 'amas':
            if(-1 != ama_send_perm_udid.indexOf(user.did)){
              send_permission = true;
            }else{
              send_permission = false;
            }
            break;
          default:
            send_permission = true;
            break;
        }
      }
    }else{
      send_permission = false;
    }
    
    var list_action_show = false;
    if(!isProduction){
      list_action_show = true;
    }else{
      if(user && -1 != admin_account.indexOf(user.did)){
        list_action_show = true;
      }
    }
    
    return (
      <Layout title="HashNews">
        <Main>
          <Typography component="p" variant="h5" className="section-description" color="textSecondary">
            自主身份发布，资讯哈希可查
            <Switch checked={this.state.show_mode === 'all'?true:false} onChange={this.onShowModeChange} disabled={user == null} size="small" className="antd-showmode-switch"/>
            {this.state.show_mode === 'all'?'全部':'我的'}
          </Typography>
          <div style={{ margin: '24px 0' }} />
          {/*<Text style={{ margin: '0 10px 0 0' }} className="antd-select">类型</Text>
          <Select defaultValue="chains" style={{ width: 100 }} onChange={this.handleNewsTypeChange} className="antd-select">
            <Option value="chains">区块链</Option>
            <Option value="ads">广告</Option>
            <Option value="soups">鸡汤</Option>
          </Select>*/}
          <Tabs defaultActiveKey={news_type} 
            onChange={this.handleNewsTypeChange}
            tabBarStyle={{background:'#fff'}}
            tabPosition="top"
            tabBarGutter={10}
          >
            {/*<TabPane tab={<span style={{ fontSize: '16px', color: '#FF0033' }}><Icon type="fire" theme="twoTone" twoToneColor="#FF0033" />热门</span>} key="hot">
            </TabPane>*/}
            <TabPane tab={<span style={{ fontSize: '14px', color: '#0' }}>快讯</span>} key="chains">
            </TabPane>
            <TabPane tab="广告" key="ads">
            </TabPane>
            <TabPane tab="备忘" key="memos">
            </TabPane>
            <TabPane tab={<span style={{ fontSize: '16px', color: '#0' }}>AMA</span>} key="amas">
            </TabPane>
            <TabPane tab="鸡汤" key="soups">
            </TabPane>
            {!isProduction && <TabPane tab="测试" key="test">
              </TabPane>
            }
          </Tabs>
          {/*<div style={{ margin: '24px 0' }} />*/}
          {send_permission && (<TextArea
            value={news_to_send}
            onChange={this.onNewsToSendChange}
            placeholder={"如: GoFun 出行推出 GoFun Connect 宣布与 ArcBlock 合作("+news_content_max_length+"字以内)"}
            autoSize={{ minRows: 1, maxRows: 10 }}
            maxLength={news_content_max_length}
          />)}
          {send_permission && (<div style={{ margin: '15px 0' }} /> )}
          {send_permission && (<Button
            key="submit"
            type="primary"
            size="large"
            onClick={this.handleSendNews}
            disabled={news_to_send === ''}
            loading={sending}
            className="antd-button-send"
          >
            发布 <br/>
            {toPay}{token.symbol}
          </Button> )}
          {send_permission && <div style={{ margin: '24px 0' }} /> }
          <LocaleProvider locale={zh_CN}>
            <List
              itemLayout="vertical"
              size="large"
              pagination={{
                onChange: page => {
                  console.log(page);
                },
                pageSize: list_items_per_page,
              }}
              dataSource={this.state.newsflash_list?this.state.newsflash_list:[]}
              footer={null}
              renderItem={item => (
                <List.Item
                  key={item.hash}
                  actions={list_action_show?[
                    <this.IconText type="like-o" text={item.like_cnt} action_type='like' like_status={item.like_status} token_symbol={token.symbol} balance={item.like_min_rem} asset_did={item.asset_did} key={"list-item-like"+item.hash} />,
                    <this.IconText type="message" text={item.comment_cnt} action_type='comment' like_status={item.like_status} token_symbol={token.symbol} balance={item.comment_min_rem} asset_did={item.asset_did}  key={"list-item-message"+item.hash} />,
                    <this.IconText type="share-alt" text={item.forward_cnt} action_type='share' like_status={item.like_status} token_symbol={token.symbol} balance={item.forward_min_rem} asset_did={item.asset_did}  key={"list-item-share"+item.hash} />,
                  ]:[]}
                  extra={null}
                  className="antd-list-item"
                >
                  <List.Item.Meta
                    avatar={item.uavatar.length>0?<img src={item.uavatar} height="40" width="40"/>:<Avatar size={40} did={item.sender} />}
                    title={<p className="antd-list-item-meta-title">{item.title}</p>}
                    description={<a href={item.href} target="_blank" className="antd-list-item-meta-description"> 哈希@{item.time} </a>}
                  />
                  <div id={item.asset_did}>
                    <Paragraph ellipsis={{ rows: 6, expandable: true }}>
                      {item.content}
                    </Paragraph>
                  </div>
                  {(list_action_show && item.comment_list.length > 0) && 
                    <this.CommentList asset_did={item.asset_did} comment_cnt={item.comment_cnt} comment_list={item.comment_list} token={token} />}
                </List.Item>
              )}
            />
            <Modal
             style={{ top: commentInpuTopOffset }}
             title={null}
             closable={false}
             visible={this.state.comment_input_visible}
             onOk={this.handleCommentInputOk}
             okText='发送'
             onCancel={this.handleCommentInputCancel}
             destroyOnClose={true}
             wrapClassName={'web'}
            >
              <TextArea
                value={comment_to_send}
                onChange={this.onCommentToSendChange}
                placeholder={"写评论..."}
                autoSize={{ minRows: 1, maxRows: 5 }}
                maxLength={news_comment_max_length}
              />
            </Modal>
            <Modal
             style={{ top: 10 }}
             title={null}
             closable={false}
             footer={null}
             visible={this.state.gen_share_news_visible}
             okText='生成'
             onOk={this.handleGenShareNewsOk}
             onCancel={this.handleGenShareNewsCancel}
             destroyOnClose={true}
             forceRender={true}
             width = {posterWinWidth}
            >
              <div id="shareNewsContent">
                <List
                  itemLayout="vertical"
                  size="large"
                  pagination={null}
                  dataSource={this.share_news_items}
                  footer={null}
                  renderItem={item => (
                    <List.Item
                      key={"share"+item.hash}
                      actions={list_action_show?[
                        <this.IconText type="like-o" text={item.like_cnt} action_type='like' like_status={item.like_status} token_symbol={token.symbol} balance={item.like_min_rem} asset_did={item.asset_did} key={"list-item-like-share"+item.hash} />,
                        <this.IconText type="message" text={item.comment_cnt} action_type='comment' like_status={item.like_status} token_symbol={token.symbol} balance={item.comment_min_rem} asset_did={item.asset_did}  key={"list-item-message-share"+item.hash} />,
                      ]:[]}
                      extra={null}
                      className="antd-list-item"
                    >
                      <List.Item.Meta
                        avatar={item.uavatar.length>0?<img src={item.uavatar} height="40" width="40"/>:<Avatar size={40} did={item.sender} />}
                        title={<p style={{ fontSize: '12px', color: '#3CB371' }}>{item.title}</p>}
                        description={<a href={item.href} target="_blank" style={{ fontSize: '12px', color: '#0000FF' }}> 哈希@{item.time} </a>}
                      />
                      {item.content}
                    </List.Item>
                  )}
                />
                <span style={{ fontSize: '14px', color: '#009966', marginLeft: 10,  marginRight: 30 }} >哈希快讯</span>
                <QrCode value={"http://abtworld.cn/newsflash"} size={60} level={'L'} fgColor={"#006699"} bgColor={"#D3D3D3"} includeMargin={false} id="HashNewsQrCode" style={{ marginRight: 0 }} />
                <span style={{fontSize: '14px', color: '#009966', marginLeft: 10 }} >http://abtworld.cn/newsflash</span> <br/>
                <span style={{fontSize: '14px', color: '#009966', marginLeft: 10 }} >自主身份发布，资讯哈希可查！</span>
              </div>
            </Modal>
            <Modal
             style={{ top: 10 }}
             title="长按分享图片"
             closable={true}
             visible={this.state.share_news_pic_visible}
             okText='完成'
             onOk={this.handleShareNewsPicOk}
             onCancel={this.handleShareNewsPicCancel}
             destroyOnClose={true}
             forceRender={true}
             width = {posterWinWidth}
            >
              <div>
                <img src="/static/blank.jpg" id="shareNewsPic" alt="HashNews"  width={posterWinWidth - 30} />
              </div>
            </Modal>
          </LocaleProvider>
        </Main>
        {sending && (
          <Auth
            responsive
            action="payment_nf"
            locale="zh"
            checkFn={api.get}
            onError={this.onPaymentError}
            onClose={this.onPaymentClose}
            onSuccess={this.onPaymentSuccess}
            extraParams={ "zh", { toPay, dapp, para } }
            messages={{
              title: '支付需求',
              scan: `该快讯需支付 ${toPay} ${token.symbol}`,
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
  
  .section-header {
    margin-bottom: 20px;
  }
  
  .section-description {
    font-size: 1.0rem;
    font-family: "Roboto", "Helvetica", "Arial", sans-serif;
    font-weight: 200;
    color: #000000;
    //margin-bottom: 20px;
    .antd-showmode-switch {
      margin-left: 10px;
      margin-right: 5px;
    }
  }
  
  .antd-select{
    font-size: 0.8rem;
    font-family: "Roboto", "Helvetica", "Arial", sans-serif;
    font-weight: 200;
    color: #000000;
  }
  
  .antd-button-send{
    height: 50px;
  }
  
  .antd-list-item{
    font-size: 1.0rem;
    font-family: Helvetica, 'Hiragino Sans GB', 'Microsoft Yahei', '微软雅黑', Arial, sans-serif;
    font-weight: 300;
    color: #000000;
    white-space: pre-wrap;
    word-wrap: break-word;
    word-break: break-all;
  }
  
  .antd-list-item-meta-title{
    font-size: 0.8rem;
    font-family: "Roboto", "Helvetica", "Arial", sans-serif;
    font-weight: 500;
    color: #3CB371;
  }
  
  .antd-list-item-meta-description{
    font-size: 0.8rem;
    font-family: "Roboto", "Helvetica", "Arial", sans-serif;
    font-weight: 200;
    color: #0000FF;
  }
  
  .antd-list-action-icon-text{
    .antd-list-action-icon-text-balance{
      font-size: 0.6rem;
      font-family: "Roboto", "Helvetica", "Arial", sans-serif;
      font-weight: 200;
      color: #FF6600;
    }
  }
  
  .antd-list-comment-list-text{
      font-size: 0.8rem;
      font-family: Helvetica, 'Hiragino Sans GB', 'Microsoft Yahei', '微软雅黑', Arial, sans-serif;
      font-weight: 100;
      color: #000000;
      white-space: pre-wrap;
      word-wrap: break-word;
      word-break: break-all;
      background-color: #F5F5F5;
   }
  
  .web {
    .ant-modal-content {
      position: relative;
      background-color: #00000000 !important;
      border: 0;
      border-radius: 4px;
      background-clip: padding-box;
      box-shadow: 0 0 0 rgba(0, 0, 0, 0) !important;
    }

    .ant-modal-body {
      padding: 0 !important;
      font-size: 0 !important;
      line-height: 1 !important;
    }
  }

`;

export default App;