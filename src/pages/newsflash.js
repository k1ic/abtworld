﻿/* eslint-disable react/jsx-one-expression-per-line */
import React, { Component } from 'react';
import styled from 'styled-components';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import useToggle from 'react-use/lib/useToggle';
import { fromUnitToToken } from '@arcblock/forge-util';
import Avatar from '@arcblock/did-react/lib/Avatar';
import DidLogo from '@arcblock/did-react/lib/Logo';
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
  Switch,
  Checkbox,
  Divider,
  Slider,
  InputNumber,
  Row,
  Col
} from "antd";
import zh_CN from 'antd/lib/locale-provider/zh_CN'
import reqwest from 'reqwest';
import 'antd/dist/antd.css';
import Auth from '@arcblock/did-react/lib/Auth';
//import moment from 'moment';
import * as QrCode from 'qrcode.react';
import * as html2canvas from 'html2canvas';
import AutoLinkText from 'react-autolink-text2';

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
const news_title_max_length = 100;
var news_content_max_length = 0;
const list_items_per_page = 10;
const news_comment_max_length = 100;

/*news type default value*/
const news_type_default = 'chains';

/*news fetch mode
 *1.chainnode
 *2.localdb
 */
const news_fetch_mode = 'localdb';

/*pay valye*/
const toPayEachChar = 0.001;

/*news weights*/
const news_weights_value_min = 1;
const news_weights_value_max = 1000;
const news_weights_value_step = 1;

/*minner numbers*/
const newsSendCfgWinWidth = 300;
const news_comment_minner_number_default = 10;
const news_like_minner_number_default = 10;
const news_forward_minner_number_default = 10;
var news_comment_minner_number_min = news_comment_minner_number_default;
var news_comment_minner_number_max = news_comment_minner_number_default;
var news_like_minner_number_min = news_comment_minner_number_default;
var news_like_minner_number_max = news_comment_minner_number_default;
var news_forward_minner_number_min = news_comment_minner_number_default;
var news_forward_minner_number_max = news_comment_minner_number_default;

/*poster window width*/
const posterWinWidth = 320;
var share_news_pic_data = '';

/*send permistion list*/
const ama_send_perm_udid = [ 'z1ZLeHSJfan2WB1vSnG7CS8whxBagCoHiHo' ];

const limit0Decimals = (value) => {
  const reg = /^(\-)*(\d+)\.().*$/;
  //console.log(value);
  if(typeof value === 'string') {
    return !isNaN(Number(value)) ? value.replace(reg, '$1') : ''
  } else if (typeof value === 'number') {
    return !isNaN(value) ? String(value).replace(reg, '$1') : ''
  } else {
    return ''
  }
};

const limit1Decimals = (value) => {
  const reg = /^(\-)*(\d+)\.(\d).*$/;
  //console.log(value);
  if(typeof value === 'string') {
    return !isNaN(Number(value)) ? value.replace(reg, '$1.$2') : ''
  } else if (typeof value === 'number') {
    return !isNaN(value) ? String(value).replace(reg, '$1.$2') : ''
  } else {
    return ''
  }
};

const limit2Decimals = (value) => {
  const reg = /^(\-)*(\d+)\.(\d\d).*$/;
  //console.log(value);
  if(typeof value === 'string') {
    return !isNaN(Number(value)) ? value.replace(reg, '$1$2.$3') : ''
  } else if (typeof value === 'number') {
    return !isNaN(value) ? String(value).replace(reg, '$1$2.$3') : ''
  } else {
    return ''
  }
};

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
      news_title_to_send: '',
      news_content_to_send: '',
      toPay: 0,
      news_to_send_weight: 1,
      news_comment_minner_number: news_comment_minner_number_default,
      news_like_minner_number: news_like_minner_number_default,
      news_forward_minner_number: news_forward_minner_number_default,
      news_to_send_cfg_visible: false,
      news_title_enabled: false,
      asset_did: '',
      show_mode: 'all',
      sending: false,
      asset_sending: false,
      newsflash_list: [],
      loading: false,
      page_number: 1,
      more_to_load: true,
      minning: false,
      comment_input_visible: false,
      comment_to_send: '',
      gen_share_news_visible: false,
      share_news_pic_visible: false,
      shared_btn_disabled: true,
    };
    
    this.comment_asset_did = '';
    this.share_asset_did = '';
    this.share_news_items = [];
    this.winW = 0;
    this.winH = 0;
    this.shareNewsPicTime = null;
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
    
    var api_url = '/api/payments';
    if(news_fetch_mode === 'localdb'){
      api_url = '/api/newsflashget';
    }
    
    reqwest({
      url: api_url,
      method: 'get',
      data: {
        module: 'newsflash',
        news_type: this.state.news_type,
        udid: udid,
        udid_to_show: udid_to_show,
        page: this.state.page_number,
        count: list_items_per_page,
        ...params,
      },
      type: 'json',
    }).then(data => {
      
      console.log('End fetchNewsFlash');
      //if(data && data.length > 0){
      //  console.log(data.slice(0, 9));
      //}
      
      let newsflash_list = this.state.newsflash_list;
      if(data && data.length > 0){
        if(newsflash_list && newsflash_list.length > 0){
          newsflash_list = newsflash_list.concat(data);
        }else{
          newsflash_list = data;
        }
      }
      let more_to_load = false;
      if(data && data.length >= list_items_per_page){
        more_to_load = true;
      }
      
      this.setState({
        newsflash_list: newsflash_list,
        more_to_load: more_to_load,
        loading: false
      });
    });
  };
  
  /*Load more news flash */
  onLoadMore = () => {
    this.setState({
      page_number: this.state.page_number+1,
    },()=>{
      this.fetchNewsFlash();
    });
  };
  
  onLoadMoreBack = () => {
    this.setState({
      newsflash_list: [],
      loading: false,
      more_to_load: true,
      page_number: 1,
    },()=>{
      this.fetchNewsFlash();
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
      //let interval = setInterval(this.fetchNewsFlash, 30000);
      //this.setState({ intervalIsSet: interval});
    }
  }
  
  /*component unmount process*/
  componentWillUnmount() {
    if (this.state.intervalIsSet) {
      clearInterval(this.state.intervalIsSet);
      this.setState({ intervalIsSet: null});
    }
  }
  
  updateToPayValue = () => {
    const { news_type, news_title_to_send, news_content_to_send, news_to_send_weight } = this.state;
    
    var toPay = 0;
    var newsLength = 0;
    if(news_title_to_send && news_title_to_send.length > 0){
      newsLength += news_title_to_send.length;
    }
    if(news_content_to_send && news_content_to_send.length > 0){
      newsLength += news_content_to_send.length;
    }
    
    if(news_type != 'test2' && newsLength > 0){
      toPay = forgeTxValueSecureConvert((toPayEachChar*news_to_send_weight)*newsLength);
    }
    this.setState({
      toPay: toPay,
    },()=>{
    });
  }
  
  handleNewsTypeChange = value => {    
    console.log('handleNewsTypeChange value=', value);
    
    this.setState({
      news_type: value,
      newsflash_list: [],
      loading: false,
      more_to_load: true,
      page_number: 1,
    },()=>{
      this.updateToPayValue();
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
    this.setState({
      newsflash_list: [],
      loading: false,
      more_to_load: true,
      page_number: 1,
      show_mode: show_mode,
    },()=>{
      console.log('show mode change to', this.state.show_mode);
      this.fetchNewsFlash();
    });
  }
  
  onNewsflashWeightChange = value => {    
    if(typeof(value) === 'number' && value <= news_weights_value_max && value >= news_weights_value_min){
      console.log('onNewsflashWeightChange: ', value);
      
      /*update minner number max*/
      news_comment_minner_number_max = Math.floor(news_comment_minner_number_default*value);
      news_like_minner_number_max = Math.floor(news_like_minner_number_default*value);
      news_forward_minner_number_max = Math.floor(news_forward_minner_number_default*value);
      
      this.setState({
        news_to_send_weight: value,
        news_comment_minner_number: news_comment_minner_number_max,
        news_like_minner_number: news_like_minner_number_max,
        news_forward_minner_number: news_forward_minner_number_max,
      },()=>{
        this.updateToPayValue();
      });
    }
  }
  
  onNewsTitleCheckBoxChange = (e) => {
    //console.log(`checked = ${e.target.checked}`);
    this.setState({
      news_title_to_send: '',
      news_title_enabled: e.target.checked,
    },()=>{
    });
  }

  onNewsTitleToSendChange = ({ target: { value } }) => {    
    //console.log('onNewsTitleToSendChange value='+value+' length='+value.length);
    
    this.setState({
      news_title_to_send: value,
    },()=>{
      this.updateToPayValue();
    });
  };
  
  onNewsContentToSendChange = ({ target: { value } }) => {    
    //console.log('onNewsContentToSendChange value='+value+' length='+value.length);
    
    this.setState({
      news_content_to_send: value,
    },()=>{
      this.updateToPayValue();
    });
  };
  
  onCommentToSendChange = ({ target: { value } }) => {
    //console.log('onCommentToSendChange value='+value+' length='+value.length);
    this.setState({ comment_to_send: value });
  };
  
  /*send news button handler*/
  onSendNews = () => {
    const { news_type, news_to_send_weight } = this.state;
    if(news_type != 'test2' && news_to_send_weight > 1){
      this.setState({
        news_to_send_cfg_visible: true,
      },()=>{
      });
    }else{
      this.handleSendNews();
    }
  }

  onNewsSendCommentMinnerNumberCfgChange = value => {
    if(typeof(value) === 'number' && value <= news_comment_minner_number_max && value >= news_comment_minner_number_min){
      console.log('onNewsSendCommentMinnerNumberCfgChange: ', value);

      this.setState({
        news_comment_minner_number: value,
      },()=>{
      });
    }
  }
  
  onNewsSendLikeMinnerNumberCfgChange = value => {
    if(typeof(value) === 'number' && value <= news_like_minner_number_max && value >= news_like_minner_number_min){
      console.log('onNewsSendLikeMinnerNumberCfgChange: ', value);

      this.setState({
        news_like_minner_number: value,
      },()=>{
      });
    }
  }
  
  onNewsSendForwardMinnerNumberCfgChange = value => {
    if(typeof(value) === 'number' && value <= news_forward_minner_number_max && value >= news_forward_minner_number_min){
      console.log('onNewsSendForwardMinnerNumberCfgChange: ', value);

      this.setState({
        news_forward_minner_number: value,
      },()=>{
      });
    }
  }

  handleNewsSendCfgOk = e => {
    console.log('handleNewsSendCfgOk');
   
    this.setState({
      news_to_send_cfg_visible: false
    },()=>{
      this.handleSendNews();
    });
  };
  
  handleNewsSendCfgCancel = e => {
    console.log('handleNewsSendCfgCancel');
    
    this.setState({
      news_to_send_cfg_visible: false
    },()=>{
    });
  };
  
  /*Send news handler*/
  handleSendNews = () => {
    const { session, news_type, news_title_to_send, news_content_to_send, news_to_send_weight, news_comment_minner_number, news_like_minner_number, news_forward_minner_number } = this.state;
    const { user, token } = session;
    
    console.log('handleSendNews');
    
    if(news_content_to_send.length > 0){
      const asset_did = HashString('sha1', news_content_to_send);
      console.log('asset_did=', asset_did);
      
      if(news_to_chain_mode === 'direct'){
        this.setState({
          asset_did: asset_did,
          sending: true,
        });
      }else{
        const formData = new FormData();
        
        formData.append('user', JSON.stringify(user));
        if(news_type === 'test2'){
          formData.append('cmd', 'create_asset_on_chain');
          this.setState({
            asset_sending: true,
          });
        }else{
          formData.append('cmd', 'add');
        }
        formData.append('asset_did', asset_did);
        formData.append('news_type', news_type);
        formData.append('news_title', news_title_to_send);
        formData.append('news_content', news_content_to_send);
        formData.append('news_weights', news_to_send_weight);
        formData.append('comment_minner_number', news_comment_minner_number);
        formData.append('like_minner_number', news_like_minner_number);
        formData.append('forward_minner_number', news_forward_minner_number);
        
        reqwest({
          url: '/api/newsflashset',
          method: 'post',
          processData: false,
          data: formData,
          success: (result) => {
            //console.log('add newsflash success with response=', result.response);
            if(news_type === 'test2'){
              this.setState({
              	news_title_to_send: '',
                news_content_to_send: '',
                toPay: 0,
                asset_sending: false,
              });
    
              setTimeout(() => {
                try {
                  this.setState({
                    newsflash_list: [],
                    loading: false,
                    more_to_load: true,
                    page_number: 1,
                  },()=>{
                    this.fetchNewsFlash();
                  });
                } catch (err) {
                  // Do nothing
                }
              }, 5000);
              
              Modal.success({title: '发布成功'});
            }else{
              this.setState({
                asset_did: asset_did,
                sending: true,
              });
            }
          },
          error: (result) => {
            console.log('add newsflash error with response=', result.response);
            if(news_type === 'test2'){
              this.setState({
                asset_sending: false,
              });
            }
            
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
    
    if(isProduction && !user){
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
                const modal_content = '获得'+result.response+token.symbol+"，请到ABT钱包中查看!";
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
        }, async ()=>{
          share_news_pic_data = '';
          var opts = {
            dpi: window.devicePixelRatio * 8,
            scale: 4,
            letterRendering: true,
            useCORS: true,
            scrollY: 0,
          };
          
          //document.getElementById('shareNewsListItemContent').style.whiteSpace = 'pre-wrap';
          //document.getElementById('shareNewsListItemContent').style.wordWrap = 'break-word';
          //document.getElementById('shareNewsListItemContent').style.wordBreak = 'break-all';
          await sleep(500);
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
            share_news_pic_visible: true,
            shared_btn_disabled: true,
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
  
  IconText = ({ type, text, token_symbol, total_min_rem, balance, minner_num, action_type, like_status, asset_did }) => (
    <span>
      {/*<img className="list-item-action-img" src="/static/images/hashnews/ABT.png" alt="ABT" height="25" width="25" />*/}
      <a onClick={e => {
          this.onListItemActionClick(action_type, asset_did);
        }}
      > 
        {action_type=='like'&&like_status==true?<Icon type={type} theme="twoTone" twoToneColor="#0000FF" style={{ marginLeft: 4, marginRight: 4 }} />:<Icon type={type} style={{ marginLeft: 8, marginRight: 8 }} />}
        <span>{text}</span>
      </a>
      {total_min_rem>0 && (<br/>)}
      {total_min_rem>0 && (<span style={{ fontSize: '10px', color: '#FF6600' }}>{balance}</span>)}
      {total_min_rem>0 && (<span style={{ fontSize: '9px', color: '#FF6600' }}>({minner_num}个)</span>)}
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
          const modal_content = '获得'+result.response+token.symbol+"，请到ABT钱包中查看!";
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
  
  handleShareNewsPicContextMenu = e => {
    //console.log('handleShareNewsPicContextMenu, e=', e);
    if(this.shareNewsPicTime){
      clearTimeout(this.shareNewsPicTime);
      this.shareNewsPicTime = null;
    }
    
    this.shareNewsPicTime = setTimeout(() => {
      this.setState({
        shared_btn_disabled: false
      },()=>{
      });
    }, 8000);
  }
  
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
            const modal_content = '获得'+result.response+token.symbol+"，请到ABT钱包中查看!";
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
      share_news_pic_visible: false,
      shared_btn_disabled: true,
    },()=>{
      share_news_pic_data = '';
      this.share_asset_did = '';
    });
  };
  
  handleShareNewsPicCancel = e => {
    console.log('handleShareNewsPicCancel share_news_pic_data.length=', share_news_pic_data.length);
    
    this.setState({
      share_news_pic_visible: false,
      shared_btn_disabled: true,
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
      news_title_to_send: '',
      news_content_to_send: '',
      toPay: 0,
      sending: false,
    });
    
    setTimeout(() => {
      try {
        this.setState({
          newsflash_list: [],
          loading: false,
          more_to_load: true,
          page_number: 1,
        },()=>{
          this.fetchNewsFlash();
        });
      } catch (err) {
        // Do nothing
      }
    }, 5000);
  };

  render() {
    const { 
      session, 
      news_type, 
      news_title_to_send, 
      news_content_to_send, 
      comment_to_send, 
      toPay, 
      sending, 
      asset_sending, 
      newsflash_list, 
      more_to_load, 
      loading } = this.state;
    //console.log('render session=', session);
    //console.log('render props=', this.props);
    
    const loadMore =
      more_to_load && !loading ? (
        <div
          style={{
            textAlign: 'center',
            marginTop: 12,
            height: 32,
            lineHeight: '32px',
          }}
        >
          <Button onClick={this.onLoadMore} style={{ fontSize: '16px', color: '#0000FF', marginRight: 20 }}><Icon type="caret-down" />更多</Button>
          <Button onClick={this.onLoadMoreBack} style={{ fontSize: '16px', color: '#009933' }}><Icon type="caret-up" />返回</Button>
        </div>
      ) 
      : (newsflash_list.length > 0?
        <div
          style={{
            textAlign: 'center',
            marginTop: 12,
            height: 32,
            lineHeight: '32px',
          }}
        >
          <Button onClick={this.onLoadMoreBack} style={{ fontSize: '16px', color: '#009933' }}><Icon type="caret-up" />返回</Button>
        </div>
         :null);
    
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
         para_obj = {type: news_type, uname: user.name, content: news_content_to_send};
      }else{
         para_obj = {type: news_type, uname: '匿名', content: news_content_to_send};
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
        switch(news_type){
          case 'hot':
            send_permission = false;
            break;
          default:
            send_permission = true;
            break;
        }
      }else{
        switch(news_type){
          case 'amas':
            if(-1 != ama_send_perm_udid.indexOf(user.did)){
              send_permission = true;
            }else{
              send_permission = false;
            }
            break;
          case 'hot':
            send_permission = false;
            break;
          default:
            send_permission = true;
            break;
        }
      }
    }else{
      send_permission = false;
    }
    
    var list_action_show = true;
    //if(!isProduction){
    //  list_action_show = true;
    //}else{
    //  if(user && -1 != admin_account.indexOf(user.did)){
    //    list_action_show = true;
    //  }
    //}
    
    return (
      <Layout title="HashNews">
        <Main>
          <Typography component="p" variant="h5" className="section-description" color="textSecondary">
            DID身份发布，资讯哈希可查
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
            tabBarGutter={8}
            animated={false}
          >
            <TabPane tab={<span style={{ fontSize: '15px', fontWeight: 600}}>热门</span>} key="hot">
            </TabPane>
            <TabPane tab={<span style={{ fontSize: '14px' }}>快讯</span>} key="chains">
            </TabPane>
            <TabPane tab={<span style={{ fontSize: '14px' }}>问答</span>} key="qnas">
            </TabPane>
            <TabPane tab={<span style={{ fontSize: '14px' }}>广告</span>} key="ads">
            </TabPane>
            <TabPane tab={<span style={{ fontSize: '14px' }}>AMA</span>} key="amas">
            </TabPane>
            <TabPane tab={<span style={{ fontSize: '14px' }}>鸡汤</span>} key="soups">
            </TabPane>
            <TabPane tab={<span style={{ fontSize: '14px' }}>备忘</span>} key="memos">
            </TabPane>
            {!isProduction && <TabPane tab="测试" key="test">
              </TabPane>
            }
            {!isProduction && <TabPane tab="测试2" key="test2">
              </TabPane>
            }
          </Tabs>
          {send_permission && (
            <Row>
              <Col span={3}>
                <span style={{fontSize: '16px', color: '#000000', margin: '15px 0' }} >权重</span>
              </Col>
              <Col span={14}>
                <Slider 
                  defaultValue={this.state.news_to_send_weight} 
                  value={typeof this.state.news_to_send_weight === 'number' ? this.state.news_to_send_weight : 1}
                  min={news_weights_value_min}
                  max={news_weights_value_max}
                  step={news_weights_value_step}
                  onChange={this.onNewsflashWeightChange}
                />
              </Col>
              <Col span={4}>
                <InputNumber
                  min={news_weights_value_min}
                  max={news_weights_value_max}
                  step={news_weights_value_step}
                  formatter={limit2Decimals}
                  parser={limit2Decimals}
                  style={{ marginLeft: 5,  marginRight: 0}}
                  value={this.state.news_to_send_weight}
                  onChange={this.onNewsflashWeightChange}
                />
             </Col>
            </Row>
          )}
          {send_permission && this.state.news_title_enabled && (
            <div style={{ margin: '5px 0' }}/>
          )}
          {send_permission && this.state.news_title_enabled && (
            <TextArea
              value={news_title_to_send}
              onChange={this.onNewsTitleToSendChange}
              placeholder={"(可选)请输入标题...("+news_title_max_length+"字以内)"}
              autoSize={{ minRows: 1, maxRows: 3 }}
              maxLength={news_title_max_length}
            />
          )}
          {send_permission && (
            <div style={{ margin: '5px 0' }}/>
          )}
          {send_permission && (
            <TextArea
              value={news_content_to_send}
              onChange={this.onNewsContentToSendChange}
              placeholder={"请输入内容...("+news_content_max_length+"字以内)"}
              autoSize={{ minRows: 1, maxRows: 10 }}
              maxLength={news_content_max_length}
            />
          )}
          {send_permission && (
            <div style={{ margin: '15px 0' }}/>
          )}
          {send_permission && (
            <span style={{ marginRight: 20 }}>
              <Checkbox checked={this.state.news_title_enabled} onChange={this.onNewsTitleCheckBoxChange}>标题</Checkbox>
            </span>
          )}
          {send_permission && (
            (news_type === 'test2')
            ?
            <Button
              key="submit"
              type="primary"
              size="large"
              onClick={this.onSendNews}
              disabled={news_content_to_send === '' || (news_content_to_send && news_content_to_send.length < 6)}
              loading={asset_sending}
              className="antd-button-send"
            >
              发布
            </Button>
            :
            <Button
              key="submit"
              type="primary"
              size="large"
              onClick={this.onSendNews}
              disabled={news_content_to_send === '' || (news_content_to_send && news_content_to_send.length < 6)}
              loading={sending}
              className="antd-button-send"
            >
              发布({toPay}{token.symbol})
            </Button>
          )}
          {send_permission && (
            <div style={{ margin: '15px 0' }} />
          )}
          <LocaleProvider locale={zh_CN}>
            <List
              itemLayout="vertical"
              size="large"
              loadMore={loadMore}
              dataSource={this.state.newsflash_list?this.state.newsflash_list:[]}
              footer={null}
              renderItem={item => (
                <List.Item
                  key={item.hash}
                  actions={list_action_show?[
                    <this.IconText type="like-o" text={item.like_cnt} action_type='like' like_status={item.like_status} token_symbol={token.symbol} total_min_rem={item.total_min_rem} balance={item.like_min_rem} minner_num={item.like_min_rem_number} asset_did={item.asset_did} key={"list-item-like"+item.hash} />,
                    <this.IconText type="message" text={item.comment_cnt} action_type='comment' like_status={item.like_status} token_symbol={token.symbol} total_min_rem={item.total_min_rem} balance={item.comment_min_rem} minner_num={item.comment_min_rem_number} asset_did={item.asset_did}  key={"list-item-message"+item.hash} />,
                    <this.IconText type="share-alt" text={item.forward_cnt} action_type='share' like_status={item.like_status} token_symbol={token.symbol} total_min_rem={item.total_min_rem} balance={item.forward_min_rem} minner_num={item.forward_min_rem_number} asset_did={item.asset_did}  key={"list-item-share"+item.hash} />,
                  ]:[]}
                  extra={null}
                  className="antd-list-item"
                >
                  <span style={{ float: 'left', marginRight: 10 }}>
                    {item.uavatar.length>0?
                      <img src={item.uavatar} height="65" width="65"/>:
                      <Avatar size={65} did={item.sender}/>}
                  </span>
                  <span style={{ fontSize: '15px', color: '#000000', marginRight: 0 }}>{item.uname}</span>
                  {item.weights > 1&&(<span style={{ fontSize: '10px', color: '#FF0000', marginRight: 0 }}>  权重:{item.weights}</span>)}
                  <br/>
                  <img src="/static/images/abtwallet/drawable-xhdpi-v4/public_card_did_icon2.png" width="25" style={{ backgroundColor: '#466BF7', marginRight: 0 }}/>                  
                  <span style={{ fontSize: '11px', color: '#000000' }}>: {item.sender}</span> <br/>
                  <a href={item.href} target="_blank" style={{ fontSize: '11px', color: '#0000FF' }}>哈希@{item.time}</a> <br/>        
                  <div id={item.asset_did}>
                    {(item.news_title.length > 0) && 
                      <span style={{ fontSize: '17px', fontWeight: 600, color: '#000000' }}>{item.news_title}</span>
                    }
                    {(item.news_title.length > 0) && <br/>}
                    {(item.news_title.length > 0) && <br/>}
                    {(item.news_content.length > 400)
                      ?
                      (item.weights > 5
                        ?
                        <Paragraph ellipsis={{ rows: 6, expandable: true }} style={{ fontSize: '16px', color: '#FF0000' }}>
                          {item.news_content}
                        </Paragraph> 
                        :
                        <Paragraph ellipsis={{ rows: 6, expandable: true }} style={{ fontSize: '16px', color: '#000000' }}>
                          {item.news_content}
                        </Paragraph>
                      )
                      :
                      (item.weights > 5
                        ?
                        <span style={{ fontSize: '16px', color: '#FF0000' }}><AutoLinkText text={item.news_content} linkProps={{ target: '_blank' }}/></span>
                        :
                        <span style={{ fontSize: '16px', color: '#000000' }}><AutoLinkText text={item.news_content} linkProps={{ target: '_blank' }}/></span>
                      )
                    }
                  </div>
                  {(list_action_show && item.comment_list.length > 0) && <br/> }
                  {(list_action_show && item.comment_list.length > 0) && 
                    <this.CommentList asset_did={item.asset_did} comment_cnt={item.comment_cnt} comment_list={item.comment_list} token={token} />
                  }
                </List.Item>
              )}
            />
            <Modal
             title="发布参数配置"
             closable={false}
             visible={this.state.news_to_send_cfg_visible}
             okText='确认'
             onOk={this.handleNewsSendCfgOk}
             onCancel={this.handleNewsSendCfgCancel}
             okButtonProps={{ disabled: false }}
             destroyOnClose={true}
             forceRender={true}
             width = {newsSendCfgWinWidth}
            >
              <span style={{ fontSize: '15px', color: '#000000' }}>点赞挖矿个数</span>
              <InputNumber
                min={news_like_minner_number_min}
                max={news_like_minner_number_max}
                step={1}
                formatter={limit0Decimals}
                parser={limit0Decimals}
                style={{ marginLeft: 10,  marginRight: 10}}
                value={this.state.news_like_minner_number}
                onChange={this.onNewsSendLikeMinnerNumberCfgChange}
              />
              <span style={{ fontSize: '15px', color: '#000000' }}>个</span>
              <br/>
              <span style={{ fontSize: '15px', color: '#000000' }}>评论挖矿个数</span>
              <InputNumber
                min={news_comment_minner_number_min}
                max={news_comment_minner_number_max}
                step={1}
                formatter={limit0Decimals}
                parser={limit0Decimals}
                style={{ marginLeft: 10,  marginRight: 10}}
                value={this.state.news_comment_minner_number}
                onChange={this.onNewsSendCommentMinnerNumberCfgChange}
              />
              <span style={{ fontSize: '15px', color: '#000000' }}>个</span>
              <br/>
              <span style={{ fontSize: '15px', color: '#000000' }}>分享挖矿个数</span>
              <InputNumber
                min={news_forward_minner_number_min}
                max={news_forward_minner_number_max}
                step={1}
                formatter={limit0Decimals}
                parser={limit0Decimals}
                style={{ marginLeft: 10,  marginRight: 10}}
                value={this.state.news_forward_minner_number}
                onChange={this.onNewsSendForwardMinnerNumberCfgChange}
              />
              <span style={{ fontSize: '15px', color: '#000000' }}>个</span>
            </Modal>
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
                <img src="/static/images/hashnews/banner.png" alt="HashNews"  width={posterWinWidth - 40} /> <br/>
                <List
                  style={{ marginLeft: 10,  marginRight: 10 }}
                  itemLayout="vertical"
                  size="large"
                  pagination={null}
                  dataSource={this.share_news_items}
                  footer={null}
                  renderItem={item => (
                    <List.Item
                      key={"share"+item.hash}
                      actions={list_action_show?[
                        <this.IconText type="like-o" text={item.like_cnt} action_type='like' like_status={item.like_status} token_symbol={token.symbol} total_min_rem={item.total_min_rem} balance={item.like_min_rem} minner_num={item.like_min_rem_number} asset_did={item.asset_did} key={"list-item-like-share"+item.hash} />,
                        <this.IconText type="message" text={item.comment_cnt} action_type='comment' like_status={item.like_status} token_symbol={token.symbol} total_min_rem={item.total_min_rem} balance={item.comment_min_rem} minner_num={item.comment_min_rem_number} asset_did={item.asset_did}  key={"list-item-message-share"+item.hash} />,
                      ]:[]}
                      extra={null}
                      className="antd-list-item"
                    >
                      <span style={{ float: 'left', marginRight: 10 }}>
                        {item.uavatar.length>0?
                        <img src={item.uavatar} height="60" width="60"/>:
                        <Avatar size={60} did={item.sender}/>}
                      </span>
                      <span style={{ fontSize: '12px', fontVariant: 'normal', color: '#000000', marginRight: 0 }}>{item.uname}</span>
                      {item.weights > 1&&(<span style={{ fontSize: '9px', color: '#FF0000', marginRight: 0 }}>  权重:{item.weights}</span>)}
                      <br/>
                      <img src="/static/images/abtwallet/drawable-xhdpi-v4/public_card_did_icon2.png" width="25" style={{ backgroundColor: '#466BF7', marginRight: 0 }}/>                  
                      <span style={{ fontSize: '11px', fontVariant: 'normal', color: '#000000' }}>: {item.sender}</span> <br/>
                      <a href={item.href} target="_blank" style={{ fontSize: '11px', fontVariant: 'normal', color: '#000000' }}>20{item.time}</a>
                      <div>
                        <br/>
                        {(item.news_title.length > 0) && 
                          <span style={{ fontSize: '13px', fontWeight: 600, color: '#000000' }}>{item.news_title}</span>
                        }
                        {(item.news_title.length > 0) && <br/>}
                        {(item.news_title.length > 0) && <br/>}
                        {item.weights > 5?
                          <span id="shareNewsListItemContent" style={{ fontSize: '11px', whiteSpace: 'pre-wrap', wordWrap: 'break-word', wordBreak: 'break-all', fontVariant: 'normal', letterSpacing: '1px', wordSpacing: '1px', color: '#FF0000' }}>{item.news_content}</span> :
                          <span id="shareNewsListItemContent" style={{ fontSize: '11px', whiteSpace: 'pre-wrap', wordWrap: 'break-word', wordBreak: 'break-all', fontVariant: 'normal', letterSpacing: '1px', wordSpacing: '1px', color: '#000000' }}>{item.news_content}</span>}
                      </div>
                    </List.Item>
                  )}
                />
                <hr style={{ height: '1px', border: 'none', borderTop: '1px solid #A9A9A9', marginTop: 0,  marginBottom: 10 }} />
                <div style={{ marginLeft: 10,  marginRight: 10 }}>
                  <QrCode value={"http://abtworld.cn/newsflash"} size={60} level={'M'} id="HashNewsQrCode" style={{ float: 'left', marginRight: 10 }} />
                  <span style={{fontSize: '13px', fontVariant: 'normal', color: '#000000', marginLeft: 0 }} >DID身份发布</span> <br/>
                  <span style={{fontSize: '13px', fontVariant: 'normal', fontWeight: 600, color: '#000000' }} >不只是资讯，想要的资讯你说了算！</span> <br/>
                </div>
              </div>
            </Modal>
            <Modal
             style={{ top: 10 }}
             title="长按图片进行分享"
             closable={false}
             visible={this.state.share_news_pic_visible}
             okText='已分享'
             onOk={this.handleShareNewsPicOk}
             onCancel={this.handleShareNewsPicCancel}
             okButtonProps={{ disabled: this.state.shared_btn_disabled }}
             destroyOnClose={true}
             forceRender={true}
             width = {posterWinWidth}
            >
              <div>
                <img src="/static/blank.jpg" id="shareNewsPic" alt="HashNews"  width={posterWinWidth - 40} onContextMenu={this.handleShareNewsPicContextMenu} />
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
    height: 30px;
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