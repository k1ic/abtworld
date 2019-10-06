/* eslint-disable react/jsx-one-expression-per-line */
import React from 'react';
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

import Layout from '../components/layout';
import useSession from '../hooks/session';
import forge from '../libs/sdk';
import api from '../libs/api';
import { getPaymentPendingFlag, setPaymentPendigFlag } from '../libs/auth';

export default function AboutPage() {
  setPaymentPendigFlag(0);
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
          关于付费资源板块
        </Typography>
        <Typography component="p" variant="h6" className="page-description" color="textSecondary">
          每个付费资源拥有唯一的资产DID，支付数据上链保存不可篡改，支付后用户拥有该资源的永久浏览权; <br/>
          用户付费后，资源拥有者的DID账户中将实时收到60%收益; <br/>
          欢迎社区伙伴们按照以下格式提交高质量的私藏资源给大家分享：<br/>
           1. 所有者，如：robert <br/>
           2. 联系方式，如：QQ/微信/邮箱 <br/>
           3. ABT钱包DID账号，如：did:abt:z1emeg4eeh55Epfdz1bV3abcC9VxQ35H5uRc <br/>
           4. 图片等资源文件，如：1.jpg <br/>
           5. 资源标题(6个字以内),如：年轻时的冒总 <br/>
           6. 资源描述，如：猜猜这是哪里？<br/>
           7. 资源定价，如: 18 TBA <br/>
        </Typography>
        <Typography component="h2" variant="h5" className="page-header" color="primary">
          联系方式
        </Typography>
        <Typography component="p" variant="h6" className="page-description" color="textSecondary">
           1. QQ：2439897034 <br/>
           2. 邮箱：2439897034@qq.com
        </Typography>
      </Main>
    </Layout>
  );
}

const Main = styled.main`
  margin: 80px 0 0;

  .page-header {
    margin-bottom: 20px;
  }

  .page-description {
    margin-bottom: 10px;
  }

`;
