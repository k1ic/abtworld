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
  Select
} from "antd";
import zh_CN from 'antd/lib/locale-provider/zh_CN'
import reqwest from 'reqwest';
import 'antd/dist/antd.css';
import Auth from '@arcblock/did-react/lib/Auth';

import Layout from '../components/layout';
import useSession from '../hooks/session';
import forge from '../libs/sdk';
import api from '../libs/api';

const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;

const isProduction = process.env.NODE_ENV === 'production';

const list_items_per_page = 5;
const listData = [];
for (let i = 0; i < 23; i++) {
  listData.push({
    href: 'http://ant.design',
    title: `ant design part ${i}`,
    description:
      'Ant Design, a design language for background applications, is refined by Ant UED Team.',
    content:
      'We supply a series of design principles, practical patterns and high quality design resources (Sketch and Axure), to help people create their product prototypes beautifully and efficiently.',
  });
}

const IconText = ({ type, text }) => (
  <span>
    <Icon type={type} style={{ marginRight: 8 }} />
    {text}
  </span>
);

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
      intervalIsSet: false,
      news_type: 'chains',
      news_to_send: '',
      newsflash_list: [],
      sending: false,
      loading: false,
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
  
  /*Fetch news flash */
  fetchNewsFlash = (params = {}) => {
    
    if(this.state.loading === true){
      console.log('fetchNewsFlash is loading');
      return;
    }
    
    console.log('Start fetchNewsFlash');
    
    this.setState({
      loading: true
    });
      
    reqwest({
      url: '/api/payments',
      method: 'get',
      data: {
        module: 'newsflash',
        news_type: this.state.news_type,
        ...params,
      },
      type: 'json',
    }).then(data => {
      
      console.log('End fetchNewsFlash');
      this.setState({
        newsflash_list: data,
        loading: false
      });
    });
  };
  
  /*component mount process*/
  componentDidMount() {
    this.fetchAppData();
    this.fetchNewsFlash();
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
    
    this.setState({news_type: value},()=>{
      this.fetchNewsFlash();
    });
  }
  
  onNewsToSendChange = ({ target: { value } }) => {
    console.log('onNewsToSendChange value='+value+' length='+value.length);
    this.setState({ news_to_send: value });
  };
  
  /*Send news handler*/
  handleSendNews = () => {
    console.log('handleSendNews');
    if(this.state.news_to_send.length > 0){
      this.setState({
        sending: true,
      });
    }
  }
  
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
      sending: false,
    });
    
    setTimeout(() => {
      try {
        this.fetchNewsFlash();
      } catch (err) {
        // Do nothing
      }
    }, 2000);
  };

  render() {
    const { session, news_type, news_to_send, sending } = this.state;
    const toPay = '0.01';
    //console.log('render session=', session);
    //console.log('render props=', this.props);
    
    if (!session) {
      return (
        <Layout title="NewsFlash">
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
    
    const { user, token } = session;
    //console.log('render session.user=', user);
    console.log('render session.token=', token);
    
    const dapp = 'newsflash';
    var para_obj = null;
    if(user){
       para_obj = {type: news_type, uname: user.name, content: news_to_send};
    }else{
       para_obj = {type: news_type, uname: '匿名', content: news_to_send};
    }
    const para = JSON.stringify(para_obj);
    
    if(this.state.newsflash_list && this.state.newsflash_list.length > 0){
      //console.log('render newsflash_list=', this.state.newsflash_list);
      console.log('render newsflash_list.length=', this.state.newsflash_list.length);
    }
    
    return (
      <Layout title="NewsFlash">
        <Main>
          <Typography component="h3" variant="h5" className="section-header" color="textSecondary">
            哈希快讯
          </Typography>
          <Typography component="p" variant="h5" className="section-description" color="textSecondary">
            <a href="https://abtwallet.io/zh/" target="_blank">ABT钱包</a>DID身份发布,快讯上链不可篡改。
          </Typography>
          <div style={{ margin: '24px 0' }} />
          <Text style={{ margin: '0 10px 0 0' }} className="antd-select">类型</Text>
          <Select defaultValue="chains" style={{ width: 100 }} onChange={this.handleNewsTypeChange} className="antd-select">
            <Option value="chains">区块链</Option>
            <Option value="soups">鸡汤</Option>
            <Option value="ads">广告</Option>
          </Select>
          <div style={{ margin: '24px 0' }} />
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
                  actions={[]}
                  extra={null}
                  className="antd-list-item"
                >
                  <List.Item.Meta
                    avatar={<Avatar size={50} did={item.sender} />}
                    title={<p className="antd-list-item-meta-title">{item.title}</p>}
                    description={<a href={item.href} className="antd-list-item-meta-description"> 哈希查看 </a>}
                  />
                  {item.content}
                </List.Item>
              )}
            />
          </LocaleProvider>
          <div style={{ margin: '24px 0' }} />
          {user && (<TextArea
            value={news_to_send}
            onChange={this.onNewsToSendChange}
            placeholder="如: GoFun 出行推出 GoFun Connect 宣布与 ArcBlock 合作(100字以内)"
            autoSize={{ minRows: 1, maxRows: 10 }}
            maxLength={100}
          />)}
          {user && (<div style={{ margin: '15px 0' }} /> )}
          {user && (<Button
            key="submit"
            type="primary"
            size="large"
            onClick={this.handleSendNews}
            disabled={news_to_send === ''}
            loading={sending}
          >
            发送
          </Button> )}
        </Main>
        {sending && (
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
  }
  
  .antd-select{
    font-size: 1.0rem;
    font-family: "Roboto", "Helvetica", "Arial", sans-serif;
    font-weight: 200;
    color: #000000;
  }
  
  .antd-list-item{
    font-size: 1.3rem;
    font-family: "Roboto", "Helvetica", "Arial", sans-serif;
    font-weight: 500;
    color: #000000;
  }
  
  .antd-list-item-meta-title{
    font-size: 1.0rem;
    font-family: "Roboto", "Helvetica", "Arial", sans-serif;
    font-weight: 200;
    color: #3CB371;
  }
  
  .antd-list-item-meta-description{
    font-size: 0.8rem;
    font-family: "Roboto", "Helvetica", "Arial", sans-serif;
    font-weight: 200;
    color: #1874CD;
  }

`;

export default App;