/* eslint no-return-assign:"off" */
import React, { useEffect } from 'react';
import qs from 'querystring';
import styled from 'styled-components';
import useToggle from 'react-use/lib/useToggle';

import Button from '@material-ui/core/Button';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import CircularProgress from '@material-ui/core/CircularProgress';
import { Menu, Icon } from 'antd';
import Auth from '@arcblock/did-react/lib/Auth';
import UserAvatar from '@arcblock/did-react/lib/Avatar';

import useSession from '../hooks/session';
import api from '../libs/api';
import env from '../libs/env';
import { setToken } from '../libs/auth';

const { SubMenu } = Menu;

var state = {
  current: 'mail',
};

var handleMoreClick = e => {
  state.current = e.key;
  console.log('handleMoreClick, e.key', e.key);
};

export default function Header() {
  const session = useSession();
  const [open, toggle] = useToggle(false);

  useEffect(() => {
    if (session.value && !session.value.user && window.location.search) {
      const params = qs.parse(window.location.search.slice(1));
      try {
        if (params.openLogin && JSON.parse(params.openLogin)) {
          toggle(true);
        }
      } catch (err) {
        // Do nothing
      }
    }
    // eslint-disable-next-line
  }, [session]);

  const onLogin = async result => {
    if (result.sessionToken) {
      setToken(result.sessionToken);
    }
    window.location.href = '/profile';
  };

  return (
    <Nav>
      <div className="nav-left">
        <Typography href="/" component="a" variant="h6" color="inherit" noWrap className="brand">
          {/*<img className="logo" src="/static/images/logo.png" alt="world" />*/}
          首页
        </Typography>
        <Typography href="/newsflash" component="a" variant="h6" color="inherit" className="text">
          哈希资讯
        </Typography>
        <Menu onClick={handleMoreClick} selectedKeys={[state.current]} mode="horizontal" theme="light" className="antd-menu" >
        <SubMenu
          title={
            <span className="submenu-title-wrapper">
              {/*<Icon type="appstore" />*/}
              更多
            </span>
          }
        >
          <Menu.ItemGroup title="">
          </Menu.ItemGroup>
          <Menu.Item key="more:1"><a href={env.chainHost.replace('/api', '/node/explorer/txs')} target="_blank">资产链</a></Menu.Item>
          <Menu.Item key="more:2"><a href={env.assetChainHost.replace('/api', '/node/explorer/txs')} target="_blank">应用链</a></Menu.Item>
          <Menu.ItemGroup title="应用">
            <Menu.Item key="more:3"><a href="/didchat" target="_parent">DID Chat</a></Menu.Item>
            <Menu.Item key="more:4"><a href="http://abtworld.cn:3080/" target="_blank">充电桩</a></Menu.Item>
            <Menu.Item key="more:5"><a href="/wools" target="_parent">薅羊毛</a></Menu.Item>
          </Menu.ItemGroup>
          <Menu.Item key="more:6"><a href="/about" target="_parent">关于我们</a></Menu.Item>
        </SubMenu>
       </Menu>
      </div>
      <div className="nav-right">
        {session.loading && (
          <Button>
            <CircularProgress size={20} color="secondary" />
          </Button>
        )}
        {session.value && !session.value.user && (
          <Button color="primary" variant="outlined" onClick={toggle}>
            登陆
          </Button>
        )}
        {session.value && session.value.user && (
          <Button href="/profile" className="avatar">
            {session.value.user.avatar.length > 0?<img src={session.value.user.avatar} height="40" width="40"/>:<UserAvatar did={session.value.user.did} />}
          </Button>
        )}
      </div>
      {open && (
        <Auth
          responsive
          locale="zh"
          action="login"
          checkFn={api.get}
          onClose={() => toggle()}
          onSuccess={(result) => {
            if (result.sessionToken) {
              setToken(result.sessionToken);
            }
            window.location.reload();
          }}
          messages={{
            title: '登陆',
            scan: '使用ABT钱包扫码登陆',
            confirm: '在ABT钱包中确认登陆',
            success: '登陆成功!',
          }}
        />
      )}
    </Nav>
  );
}

const Nav = styled(Toolbar)`
  display: flex;
  align-items: center;
  justify-content: space-between;

  && {
    padding-left: 0;
    padding-right: 0;
  }
  
  .antd-menu{
    width: 80px;
    background: rgba(128, 128, 128, 0);
    font-size: 1.0rem;
    font-family: "Roboto", "Helvetica", "Arial", sans-serif;
    font-weight: 500;
    color: #000000;
    line-height: 1.6;
    letter-spacing: 0.0075em;
    margin-right: 10px;
  }
  
  .nav-left {
    display: flex;
    align-items: center;
    justify-content: flex-start;

    .brand {
      margin-right: 10px;
      cursor: pointer;
      display: flex;
      justify-content: flex-start;
      align-items: center;
      font-size: 1.0rem;
      font-family: "Roboto", "Helvetica", "Arial", sans-serif;
      font-weight: 500;

      .logo {
        width: 32px;
        heigh: 32px;
        margin-right: 10px;
      }
    }
    
    .text {
      font-size: 1.0rem;
      font-family: "Roboto", "Helvetica", "Arial", sans-serif;
      font-weight: 500;
      margin-right: 10px;
    }
  }

  .nav-right {
    display: flex;
    align-items: center;
    justify-content: flex-end;

    .github {
      margin-right: 10px;
    }
  }
`;
