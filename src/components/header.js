/* eslint no-return-assign:"off" */
import React, { useEffect } from 'react';
import qs from 'querystring';
import styled from 'styled-components';
import useToggle from 'react-use/lib/useToggle';

import Button from '@material-ui/core/Button';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import CircularProgress from '@material-ui/core/CircularProgress';
import Auth from '@arcblock/did-react/lib/Auth';
import UserAvatar from '@arcblock/did-react/lib/Avatar';

import useSession from '../hooks/session';
import api from '../libs/api';
import env from '../libs/env';
import { setToken } from '../libs/auth';

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
          <img className="logo" src="/static/images/logo.png" alt="world" />
          首页
        </Typography>
        <Typography
          component="a"
          href={env.chainHost.replace('/api', '/node/explorer/txs')}
          target="_blank"
          variant="h6"
          color="inherit"
          className="text">
          浏览器
        </Typography>
        <Typography href="/about" component="a" variant="h6" color="inherit" className="text">
          关于
        </Typography>
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
            <UserAvatar did={session.value.user.did} />
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
          onSuccess={onLogin}
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

  .nav-left {
    display: flex;
    align-items: center;
    justify-content: flex-start;

    .brand {
      margin-right: 16px;
      cursor: pointer;
      display: flex;
      justify-content: flex-start;
      align-items: center;

      .logo {
        width: 32px;
        heigh: 32px;
        margin-right: 16px;
      }
    }
    
    .text {
      margin-right: 16px;
    }
  }

  .nav-right {
    display: flex;
    align-items: center;
    justify-content: flex-end;

    .github {
      margin-right: 16px;
    }
  }
`;
