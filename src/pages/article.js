﻿/* eslint-disable react/jsx-one-expression-per-line */
import React, { Component } from 'react';
import qs from 'querystring';
import styled from 'styled-components';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import useToggle from 'react-use/lib/useToggle';
import { fromUnitToToken } from '@arcblock/forge-util';
import CircularProgress from '@material-ui/core/CircularProgress';
import { 
  LocaleProvider, 
  List,
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
import AutoLinkText from 'react-autolink-text2';

import Layout from '../components/layout';
import useSession from '../hooks/session';
import forge from '../libs/sdk';
import api from '../libs/api';
import env from '../libs/env';
import { forgeTxValueSecureConvert } from '../libs/crypto';
import { getCurrentTime } from '../libs/time';
import { getUserDidFragment } from '../libs/user';

const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;

const admin_account = env.appAdminAccounts;
const isProduction = process.env.NODE_ENV === 'production';
const sleep = timeout => new Promise(resolve => setTimeout(resolve, timeout));

const article_home_href = '/#type=articles'

/*user action parameter*/
const news_comment_max_length = 100;

const renderCommentList = (x, token) => (
  <span>
    <span style={{ fontSize: '14px', color: '#3CB371' }}>{x.uname}：</span>
    <span style={{ fontSize: '14px', color: '#0', whiteSpace: 'pre-wrap', wordWrap: 'break-word', wordBreak: 'normal' }}>{x.comment}</span>
    {(x.mbalance>0)?<span style={{ fontSize: '10px', color: '#FF6600' }}> +{x.mbalance} {token.symbol}</span>:''}
    <br/>
  </span>
);

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
      minning: false,
      comment_input_visible: false,
      comment_to_send: '',
      share_news_user_slogan_input_visible: false,
    };
    
    this.winW = 0;
    this.winH = 0;
    this.comment_asset_did = '';
    this.share_asset_did = '';
    this.share_news_items = [];
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
    
    if(user){    
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
                user_to_pay: user_to_pay,
              }, ()=>{
              });
            }else{
              this.setState({
                user_to_pay: 0,
              }, ()=>{
              });
            }
          
          });
        });
      } catch (err) {
      }
    }else{
      this.setState({
        user_to_pay: news_item.news_article_worth,
      }, ()=>{
      });
    }
  }
  
  /*component mount process*/
  componentDidMount() {
    window.document.oncontextmenu = function(){ 
      //disable rigth click menu
      return false;
    }
    
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
  
  onCommentToSendChange = ({ target: { value } }) => {
    //console.log('onCommentToSendChange value='+value+' length='+value.length);
    this.setState({ comment_to_send: value });
  };
  
  handleCommentInputOk = e => {
    const { session, news_item, comment_to_send } = this.state;
    const { user, token } = session;
    var newsflashItem = news_item;
    
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
          newsflashItem.remain_comment_minner_balance -= parseFloat(result.response);
          newsflashItem.remain_comment_minner_balance = forgeTxValueSecureConvert(newsflashItem.remain_comment_minner_balance);
          const modal_content = '获得'+result.response+token.symbol+"，请到ABT钱包中查看!";
          Modal.success({title: modal_content});
        }else{
          console.log('comment minning poll is empty');
        }
        
        newsflashItem.comment_counter += 1;
        comment_list_item.mbalance = parseFloat(result.response);
        newsflashItem.comment_list.push(comment_list_item);
        
        this.setState({
          news_item: newsflashItem,
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
      comment_input_visible: false
    },()=>{
      this.comment_asset_did = '';
    });
  };
  
  onListItemActionClick = async (action_type) => {
    const { session, asset_did, news_item } = this.state;
    const { user, token } = session;
    var newsflashItem = news_item;
    
    console.log('onListItemActionClick action_type=', action_type);
    
    if(!newsflashItem){
      console.log('onListItemActionClick invalid newsflash item');
      return null;
    }
    
    if(!user && action_type != 'share'){
      window.location.href = '/?openLogin=true';
      return null;
    }
    
    switch(action_type){
      case 'like':
        /*verify if already liked*/
        if(this.newsflashListItemLikeStatusGet(newsflashItem, user.did)){
          Modal.success({title: '已赞过', maskClosable: 'true'});
        }else{
          newsflashItem.like_counter += 1;
          const like_list_item = {
           udid: user.did,
           mbalance: 0
          };
          newsflashItem.like_list.push(like_list_item);
          newsflashItem.like_status = true;
          
          /*send like minning request*/
          this.setState({
            news_item: newsflashItem,
            minning: true,
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
                newsflashItem.remain_like_minner_balance -= parseFloat(result.response);
                newsflashItem.remain_like_minner_balance = forgeTxValueSecureConvert(newsflashItem.remain_like_minner_balance);
                const modal_content = '获得'+result.response+token.symbol+"，请到ABT钱包中查看!";
                Modal.success({title: modal_content});
              }else{
                console.log('like minning poll is empty');
              }
              this.setState({
                news_item: newsflashItem,
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
          comment_input_visible: true
        });
        break;
      case 'share':
        this.share_asset_did = asset_did;
        this.share_news_items[0] = newsflashItem;
        
        this.setState({
          share_news_user_slogan_input_visible: true
        }, async ()=>{
        });
        
        break;
      default:
        break;
    }
    
  };
  
  onPayToViewButtonClick = () => {
    const { session, asset_did, news_item } = this.state;
    const { user, token } = session;
    
    if(!user){
      window.location.href = '/?openLogin=true';
      return null;
    }else{
      this.setState({
        open_payment: true,
      },()=>{
      });
    }
  }
  
  IconText = ({ type, text, token_symbol, total_min_rem, balance, minner_num, action_type, like_status, asset_did }) => (
    <span>
      <a onClick={e => {
          this.onListItemActionClick(action_type, asset_did);
        }}
      > 
        {action_type=='like'&&like_status==true?<Icon type={type} theme="twoTone" twoToneColor="#0000FF" style={{ fontSize: '16px', marginLeft: 0, marginRight: 4 }} />:<Icon type={type} style={{ fontSize: '16px', marginLeft: 0, marginRight: 8 }} />}
        <span>{text}</span>
      </a>
      {total_min_rem>0 && (<br/>)}
      {total_min_rem>0 && (<span style={{ fontSize: '10px', color: '#FF6600' }}>{balance}</span>)}
      {total_min_rem>0 && (<span style={{ fontSize: '10px', color: '#FF6600' }}>({minner_num}个)</span>)}
    </span>
  );
  
  CommentList = ({ asset_did, comment_cnt, comment_list, token }) => (
    <Paragraph className="antd-list-comment-list-text" ellipsis={{ rows: 10, expandable: true }}>
      {comment_list.map(x => renderCommentList(x, token))}
    </Paragraph>
  );
  
  render() {
    const { 
      session,
      asset_did, 
      news_item,
      open_payment,
      user_to_pay,
      comment_input_visible,
      comment_to_send
    } = this.state;
    //console.log('render session=', session);
    //console.log('render props=', this.props);
    
    if (!session || !news_item || user_to_pay === null) {
      return (
        <Layout title="文章">
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
    
    this.winW = window.innerWidth;  //浏览器窗口的内部宽度
    this.winH = window.innerHeight; //浏览器窗口的内部高度
    //this.winW = window.screen.width; //显示屏幕的高度
    //this.winH = window.screen.height;  //显示屏幕的宽度
    //console.log('render winW=', this.winW, 'winH=', this.winH);
    var commentInpuTopOffset = this.winH/2;
    if(commentInpuTopOffset == 0){
      commentInpuTopOffset = 20;
    }
    
    //article parameter
    var news_list = [];
    news_list.push(news_item);
    if(user){
      news_list[0]['like_status'] = this.newsflashListItemLikeStatusGet(news_item, user.did);
    }else{
      news_list[0]['like_status'] = false;
    }
    news_list[0]['total_min_rem'] = news_item.remain_comment_minner_balance + news_item.remain_like_minner_balance + news_item.remain_forward_minner_balance;
    if(news_item.remain_like_minner_balance > 0 && news_item.each_like_minner_balance > 0){
      news_list[0]['like_min_rem_number'] = Math.round(news_item.remain_like_minner_balance/news_item.each_like_minner_balance);
    }else{
      news_list[0]['like_min_rem_number'] = 0;
    }
    if(news_item.remain_comment_minner_balance > 0 && news_item.each_comment_minner_balance > 0){
      news_list[0]['comment_min_rem_number'] = Math.round(news_item.remain_comment_minner_balance/news_item.each_comment_minner_balance);
    }else{
      news_list[0]['comment_min_rem_number'] = 0;
    }
    news_list[0]['author_did_abbr'] = getUserDidFragment(news_item.author_did);
    
    var content_preview_length = Math.round(news_item.news_content.length * 0.10);
    
    console.log('user_to_pay=',user_to_pay, 'content_preview_length=', content_preview_length);
    
    var list_action_show = true;
    if(user_to_pay > 0){
      list_action_show = false;
    }
    
    //payment parameter
    const toPay = String(user_to_pay);
    const dapp = 'article';
    const para_obj = {asset_did: asset_did};
    const para = JSON.stringify(para_obj);
    
    return (
      <Layout title="文章">
        <Main>
          <link
            rel="stylesheet"
            type="text/css"
            href="https://cdn.jsdelivr.net/npm/@arcblock/did-logo@latest/style.css"
          />
          <LocaleProvider locale={zh_CN}>
            {(
              <div className="article-body">
                <List
                  itemLayout="vertical"
                  size="large"
                  dataSource={news_list}
                  footer={null}
                  renderItem={item => (
                    <List.Item
                      key={item.news_hash}
                      actions={list_action_show?[
                        <this.IconText type="like-o" text={item.like_counter} action_type='like' like_status={item.like_status} token_symbol={token.symbol} total_min_rem={item.total_min_rem} balance={item.remain_like_minner_balance} minner_num={item.like_min_rem_number} asset_did={item.asset_did} key={"list-item-like"+item.news_hash} />,
                        <this.IconText type="message" text={item.comment_counter} action_type='comment' like_status={item.like_status} token_symbol={token.symbol} total_min_rem={item.total_min_rem} balance={item.remain_comment_minner_balance} minner_num={item.comment_min_rem_number} asset_did={item.asset_did}  key={"list-item-message"+item.news_hash} />,
                      ]:[]}
                      extra={null}
                      className="antd-list-item"
                    >
                      <div>
                        <span style={{ float: 'left', marginRight: 10 }}>
                          {item.author_avatar.length>0?
                            <img src={item.author_avatar} height="65" width="65" style={{ borderRadius: '50%' }}/>:
                            <Avatar size={65} did={item.author_did} style={{ borderRadius: '50%' }} />}
                        </span>
                        <span style={{ fontSize: '15px', color: '#000000', marginRight: 0 }}>{item.author_name}</span>
                        <span style={{ fontSize: '10px', color: '#FF0000', marginRight: 0 }}> {item.news_article_worth} {token.symbol}</span>
                        <br/>
                        <i class="icon-did-abt-logo" style={{fontSize: '15px', color: '#000000'}}></i>
                        <span style={{ fontSize: '15px', color: '#000000' }}> {item.author_did_abbr}</span> <br/>
                        <a href={item.hash_href} target="_blank" style={{ fontSize: '11px', color: '#0000FF' }}>{item.data_chain_nodes[0].name.substring(0,1).toUpperCase()+item.data_chain_nodes[0].name.substring(1)} - 哈希@{item.news_time}</a> <br/>        
                      </div>
                      <div id={item.asset_did}>
                        {(item.news_title.length > 0) && 
                          <div>
                             <span style={{ fontSize: '17px', fontWeight: 600, color: '#000000' }}>{item.news_title}</span>
                             <br/>
                             <br/>
                          </div>
                        }
                        
                        {(user_to_pay > 0)
                          ?
                          <span style={{ fontSize: '16px', color: '#000000' }}><AutoLinkText text={item.news_content.slice(0, content_preview_length)+'......'} linkProps={{ target: '_blank' }}/></span>
                          :
                          <span style={{ fontSize: '16px', color: '#000000' }}><AutoLinkText text={item.news_content} linkProps={{ target: '_blank' }}/></span>
                        }
                        <br/>
                        
                        {(user_to_pay == 0) && (
                          <div>
                            <img src={item.news_images[0]} alt="HashNews" width="100%" style={{ borderRadius: '10px' }}/>
                            {(item.news_origin.length > 0) &&
                              <div>
                                <br/>
                                <span style={{ fontSize: '10px', color: '#888888' }}>来源：{item.news_origin}  查看次数：{item.article_payed_counter}</span>
                              </div>
                            }
                          </div>
                        )}
                        {(user_to_pay > 0) && (
                          <div align='center'>
                            <Button
                              type="link"
                              onClick={this.onPayToViewButtonClick}
                            >
                              <br/>
                              <span style={{ fontSize: '15px', fontWeight: 600, color: "#339966" }}>查看完整内容</span>
                            </Button>
                          </div>
                        )}
                        
                      </div>
                    </List.Item>
                  )}
                />
                {(list_action_show && news_item.comment_list.length > 0) && 
                  <this.CommentList asset_did={news_item.asset_did} comment_cnt={news_item.comment_counter} comment_list={news_item.comment_list} token={token} />
                }
              </div>
            )}
            <Modal
             style={{ top: commentInpuTopOffset }}
             title={null}
             closable={false}
             visible={comment_input_visible}
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
                autoSize={{ minRows: 2, maxRows: 5 }}
                maxLength={news_comment_max_length}
              />
            </Modal>
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
  
  .article-body {
    pointer-event:none;-webkit-user-select:none;-moz-user-select:none;user-select:none;
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
  
`;

export default App;